import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const ACTIVE_RECORDING_KEY = 'synapse_ai_active_recording_uri';
const RECORDINGS_QUEUE_KEY = 'synapse_ai_recordings_queue';
const RECORDINGS_DIR = FileSystem.documentDirectory + 'recordings/';

export interface QueueItem {
  id: string;
  localUri: string;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

/**
 * Zapewnia, że katalog na trwałe nagrania istnieje.
 */
async function ensureDirectoryExists(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
  if (!dirInfo.exists) {
    console.log('[Queue] Tworzenie trwałego katalogu na nagrania:', RECORDINGS_DIR);
    await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
  }
}

/**
 * Zapisuje ścieżkę aktualnie trwającego nagrywania (ochrona przed awarią).
 */
export async function saveActiveRecordingUri(uri: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_RECORDING_KEY, uri);
    console.log('[Queue] Zapisano aktywną ścieżkę nagrywania:', uri);
  } catch (error) {
    console.error('[Queue] Błąd podczas zapisywania aktywnej ścieżki:', error);
  }
}

/**
 * Usuwa ścieżkę aktywnego nagrania (wywoływane po normalnym zakończeniu).
 */
export async function clearActiveRecordingUri(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVE_RECORDING_KEY);
    console.log('[Queue] Wyczyszczono aktywną ścieżkę nagrywania.');
  } catch (error) {
    console.error('[Queue] Błąd podczas czyszczenia aktywnej ścieżki:', error);
  }
}

/**
 * Pobiera ścieżkę aktywnego nagrania.
 */
export async function getActiveRecordingUri(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_RECORDING_KEY);
  } catch (error) {
    console.error('[Queue] Błąd pobierania aktywnej ścieżki:', error);
    return null;
  }
}

/**
 * Pobiera całą kolejkę zapisanych nagrań.
 */
export async function getQueue(): Promise<QueueItem[]> {
  try {
    const rawQueue = await AsyncStorage.getItem(RECORDINGS_QUEUE_KEY);
    if (!rawQueue) return [];
    return JSON.parse(rawQueue);
  } catch (error) {
    console.error('[Queue] Błąd pobierania kolejki:', error);
    return [];
  }
}

/**
 * Zapisuje kolejkę w AsyncStorage.
 */
async function saveQueue(queue: QueueItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(RECORDINGS_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[Queue] Błąd zapisu kolejki:', error);
  }
}

/**
 * Przenosi nagranie z tymczasowej ścieżki do trwałego katalogu i rejestruje w kolejce.
 */
export async function persistRecordingToQueue(tempUri: string): Promise<QueueItem> {
  await ensureDirectoryExists();
  const id = `rec_${Date.now()}`;
  const fileName = `${id}.m4a`;
  const localUri = RECORDINGS_DIR + fileName;

  console.log('[Queue] Kopiowanie pliku z cache do trwałej pamięci:', tempUri, '->', localUri);
  await FileSystem.copyAsync({
    from: tempUri,
    to: localUri,
  });

  const newItem: QueueItem = {
    id,
    localUri,
    timestamp: Date.now(),
    status: 'pending',
  };

  const queue = await getQueue();
  queue.push(newItem);
  await saveQueue(queue);

  console.log('[Queue] Dodano nagranie do kolejki:', id);
  return newItem;
}

/**
 * Usuwa nagranie z kolejki oraz fizycznie kasuje plik z pamięci telefonu.
 */
export async function removeFromQueue(id: string): Promise<void> {
  try {
    const queue = await getQueue();
    const item = queue.find((i) => i.id === id);
    
    if (item) {
      console.log('[Queue] Usuwanie pliku lokalnego:', item.localUri);
      // Próba skasowania pliku z dysku
      const fileInfo = await FileSystem.getInfoAsync(item.localUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(item.localUri, { idempotent: true });
      }
    }

    const newQueue = queue.filter((i) => i.id !== id);
    await saveQueue(newQueue);
    console.log('[Queue] Usunięto z kolejki element o ID:', id);
  } catch (error) {
    console.error('[Queue] Błąd podczas usuwania elementu o ID:', id, error);
  }
}

/**
 * Aktualizuje status i ewentualny błąd elementu w kolejce.
 */
export async function updateQueueItemStatus(
  id: string,
  status: 'pending' | 'syncing' | 'failed',
  error?: string
): Promise<void> {
  const queue = await getQueue();
  const index = queue.findIndex((i) => i.id === id);
  if (index !== -1) {
    queue[index].status = status;
    queue[index].error = error;
    await saveQueue(queue);
    console.log(`[Queue] Zaktualizowano status ${id} na ${status}. Błąd:`, error || 'brak');
  }
}

/**
 * Odzyskiwanie nagrania po nagłym zamknięciu aplikacji.
 * Jeśli istnieje plik powiązany z aktywnym nagraniem, dodaje go do kolejki.
 */
export async function recoverCrashRecording(): Promise<QueueItem | null> {
  const activeUri = await getActiveRecordingUri();
  if (!activeUri) return null;

  console.log('[Queue] Wykryto nieobsłużoną ścieżkę nagrania po crashu:', activeUri);
  
  try {
    const fileInfo = await FileSystem.getInfoAsync(activeUri);
    if (!fileInfo.exists || fileInfo.size === 0) {
      console.warn('[Queue] Plik z przerwanej sesji nie istnieje lub jest pusty. Czyszczenie.');
      await clearActiveRecordingUri();
      return null;
    }

    // Dodanie do trwałej kolejki
    console.log('[Queue] Plik z crasha istnieje (rozmiar:', fileInfo.size, 'bajtów). Kopiowanie do kolejki.');
    const recoveredItem = await persistRecordingToQueue(activeUri);
    
    // Pomyślnie przeniesiono – czyścimy wskaźnik aktywnego nagrania
    await clearActiveRecordingUri();
    return recoveredItem;
  } catch (error) {
    // Solidny blok try-catch zalecany przez Code Review - zapobiega pętli awarii
    console.error('[Queue] Krytyczny błąd podczas odzyskiwania nagrania z crasha. Czyszczenie wskaźnika.', error);
    await clearActiveRecordingUri();
    return null;
  }
}

/**
 * Synchronizacja kolejki - przesyłanie zaległych nagrań.
 */
export async function syncQueue(
  uploadFn: (uri: string) => Promise<any>
): Promise<{ successCount: number; failCount: number }> {
  const queue = await getQueue();
  const pendingItems = queue.filter((item) => item.status !== 'syncing');
  
  let successCount = 0;
  let failCount = 0;

  console.log(`[Queue] Rozpoczynamy synchronizację kolejki. Elementów do przetworzenia: ${pendingItems.length}`);

  for (const item of pendingItems) {
    try {
      await updateQueueItemStatus(item.id, 'syncing');
      
      console.log(`[Queue] Próba wysłania elementu ${item.id} (${item.localUri})...`);
      const response = await uploadFn(item.localUri);
      
      // Zgodnie z wytycznymi Code Review: usuwamy tylko po pełnym sukcesie (status sukcesu z serwera)
      if (response && (response.status === 'success' || response.status === 'ok')) {
        console.log(`[Queue] Pomyślnie wysłano element ${item.id}. Usuwanie pliku lokalnego.`);
        await removeFromQueue(item.id);
        successCount++;
      } else {
        throw new Error(response?.message || 'Serwer zwrócił nieznany status odpowiedzi');
      }
    } catch (error: any) {
      console.error(`[Queue] Błąd wysyłania elementu ${item.id}:`, error?.message || error);
      await updateQueueItemStatus(item.id, 'failed', error?.message || 'Błąd połączenia');
      failCount++;
    }
  }

  return { successCount, failCount };
}
