import { supabase } from './supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Pozwala przeglądarce poinformować system operacyjny o chęci powrotu do aplikacji
WebBrowser.maybeCompleteAuthSession();

export interface UserSession {
  name: string;
  email: string;
}

/**
 * Rejestracja nowego użytkownika za pomocą e-maila i hasła.
 */
export async function signUpWithEmail(email: string, password: string, name: string): Promise<any> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: name.trim(),
      },
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Logowanie użytkownika za pomocą e-maila i hasła.
 */
export async function signInWithEmail(email: string, password: string): Promise<any> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Logowanie za pomocą Google / Facebook (OAuth) wykorzystujące in-app browser
 * i PKCE (wymiana kodu autoryzacyjnego).
 */
export async function signInWithOAuth(provider: 'google' | 'facebook'): Promise<void> {
  // Wykorzystujemy wyłącznie produkcyjny scheme synapse-ai://
  const redirectUrl = 'synapse-ai://auth/callback';

  console.log(`[Auth] Inicjowanie OAuth (${provider}) z przekierowaniem do:`, redirectUrl);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true, // Zwraca URL zamiast automatycznego przekierowania (wymagane w React Native)
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error('Brak adresu URL do autoryzacji.');

  // Otwarcie okna przeglądarki i nasłuchiwanie na powrót
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

  if (result.type === 'success') {
    console.log('[Auth] Logowanie OAuth udane, pobrano URL powrotny:', result.url);
    const parsedUrl = Linking.parse(result.url);
    const { access_token, refresh_token, code } = parsedUrl.queryParams || {};

    if (access_token && refresh_token) {
      console.log('[Auth] Bezpośrednie ustawianie sesji ze zwrócenia URL...');
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: String(access_token),
        refresh_token: String(refresh_token),
      });
      if (sessionError) throw sessionError;
    } else if (code) {
      console.log('[Auth] Wykryto kod PKCE, wymiana na sesję...');
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(String(code));
      if (exchangeError) throw exchangeError;
    } else {
      console.warn('[Auth] Powrót z OAuth nastąpił, ale brak tokenów lub kodu w parametrach.');
    }
  } else {
    console.log('[Auth] Autoryzacja OAuth przerwana przez użytkownika. Status:', result.type);
  }
}

/**
 * Pobiera dane zalogowanego użytkownika z aktualnej sesji.
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session || !session.user) return null;

    const user = session.user;
    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Użytkownik';
    
    return {
      name,
      email: user.email || '',
    };
  } catch (error) {
    console.error('[Auth] Błąd pobierania użytkownika:', error);
    return null;
  }
}

/**
 * Wylogowuje użytkownika.
 */
export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  console.log('[Auth] Pomyślnie wylogowano.');
}

/**
 * Sprawdza czy użytkownik jest zalogowany.
 */
export async function isLoggedIn(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
