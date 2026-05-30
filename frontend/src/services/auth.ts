import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_SESSION_KEY = 'synapse_ai_user_session';

export interface UserSession {
  name: string;
  email: string;
}

/**
 * Zapisuje sesję użytkownika.
 */
export async function login(name: string, email: string): Promise<UserSession> {
  const session: UserSession = { name: name.trim(), email: email.trim().toLowerCase() };
  await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
  console.log('[Auth] Pomyślnie zalogowano użytkownika:', session);
  return session;
}

/**
 * Czyści sesję (wylogowanie).
 */
export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(USER_SESSION_KEY);
  console.log('[Auth] Użytkownik został wylogowany.');
}

/**
 * Pobiera dane zalogowanego użytkownika.
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const rawSession = await AsyncStorage.getItem(USER_SESSION_KEY);
    if (!rawSession) return null;
    return JSON.parse(rawSession);
  } catch (error) {
    console.error('[Auth] Błąd podczas pobierania sesji:', error);
    return null;
  }
}

/**
 * Sprawdza czy użytkownik jest zalogowany.
 */
export async function isLoggedIn(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
