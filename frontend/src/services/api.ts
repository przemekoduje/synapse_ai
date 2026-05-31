// Pobieranie URL z plików .env (Expo 49+ wspiera EXPO_PUBLIC_)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

console.log('Zainicjalizowano API z adresem:', API_BASE_URL);

/**
 * Serwis komunikacji z backendem Synapse AI (używamy fetch dla lepszej stabilności w React Native)
 */

export const analyzeMeeting = async (transcription: string, session_id: string, user_flags: object) => {
  try {
    console.log('[API] Analiza spotkania (fetch) dla sesji:', session_id);
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
      body: JSON.stringify({
        session_id,
        transcription,
        timestamp: new Date().toISOString(),
        user_action_flags: user_flags,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Błąd analizy');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Błąd podczas analyzeMeeting:', error?.message || error);
    throw error;
  }
};

export const uploadAudio = async (uri: string, userId?: string) => {
  try {
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: uri,
      name: 'audio_recording.m4a',
      type: 'audio/m4a',
    });

    if (userId) {
      formData.append('user_id', userId);
    }

    console.log('[API] Wysyłanie audio (fetch) do /upload-audio z timeoutem 90s...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('[API] Przekroczono limit czasu (90s) żądania /upload-audio. Przerywanie połączenia.');
      controller.abort();
    }, 90000);

    const response = await fetch(`${API_BASE_URL}/upload-audio`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Błąd serwera');
    }

    return await response.json();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Błąd podczas uploadu audio: Przekroczono limit czasu żądania (90s)');
      throw new Error('Przekroczono limit czasu żądania (90s) - serwer przetwarza dane zbyt długo.');
    }
    console.error('Błąd podczas uploadu audio:', error?.message || error);
    throw error;
  }
};

export const uploadVideoInspection = async (uri: string) => {
  try {
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: uri,
      name: 'inspection_video.mp4',
      type: 'video/mp4',
    });

    console.log('[API] Wysyłanie wideo (fetch) do /inspect...');
    const response = await fetch(`${API_BASE_URL}/inspect`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Błąd serwera');
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('Błąd podczas uploadu wideo:', error?.message || error);
    throw error;
  }
};

export const askQuestion = async (meetingId: string, question: string) => {
  try {
    console.log('[API] Zadawanie pytania do spotkania:', meetingId);
    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
      body: JSON.stringify({
        meeting_id: meetingId,
        question: question,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Błąd generowania odpowiedzi');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Błąd podczas askQuestion:', error?.message || error);
    throw error;
  }
};

