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

export const uploadAudio = async (uri: string) => {
  try {
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: uri,
      name: 'audio_recording.m4a',
      type: 'audio/m4a',
    });

    console.log('[API] Wysyłanie audio (fetch) do /transcribe...');
    const response = await fetch(`${API_BASE_URL}/transcribe`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Błąd serwera');
    }

    return await response.json();
  } catch (error: any) {
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

