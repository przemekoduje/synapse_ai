import * as FileSystem from 'expo-file-system/legacy';

const STORAGE_FILE = FileSystem.documentDirectory + 'app_persistent_storage.json';

async function readStorage(): Promise<Record<string, string>> {
  try {
    const info = await FileSystem.getInfoAsync(STORAGE_FILE);
    if (!info.exists) return {};
    const content = await FileSystem.readAsStringAsync(STORAGE_FILE);
    return JSON.parse(content);
  } catch (err) {
    // W razie błędu zwracamy pusty słownik
    return {};
  }
}

async function writeStorage(data: Record<string, string>): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(STORAGE_FILE, JSON.stringify(data));
  } catch (err) {
    console.error('[Storage] Błąd zapisu pliku storage:', err);
  }
}

export const appStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const data = await readStorage();
    return data[key] !== undefined ? data[key] : null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const data = await readStorage();
    data[key] = value;
    await writeStorage(data);
  },
  removeItem: async (key: string): Promise<void> => {
    const data = await readStorage();
    delete data[key];
    await writeStorage(data);
  }
};
