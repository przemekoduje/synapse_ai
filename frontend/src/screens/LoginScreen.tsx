import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  Alert,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { signInWithEmail, signUpWithEmail, signInWithOAuth } from '../services/auth';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [isSignUp, setIsSignUp] = useState(false); // przełącznik Logowanie / Rejestracja
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null);

  const validateEmail = (text: string) => {
    const reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    return reg.test(text);
  };

  const handleEmailAuth = async () => {
    if (isSignUp && !name.trim()) {
      Alert.alert('Brak danych', 'Proszę podać swoje imię.');
      return;
    }
    if (!email.trim() || !validateEmail(email)) {
      Alert.alert('Błędny e-mail', 'Proszę podać poprawny adres e-mail.');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Słabe hasło', 'Hasło musi mieć co najmniej 6 znaków.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name);
        Alert.alert(
          'Rejestracja pomyślna 🎉',
          'Konto zostało utworzone. Jeśli w konfiguracji Supabase wymagane jest potwierdzenie e-mail, sprawdź swoją skrzynkę pocztową. Możesz się teraz zalogować.',
          [{ text: 'OK', onPress: () => setIsSignUp(false) }]
        );
      } else {
        await signInWithEmail(email, password);
        // Powrót i reset stosu
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }
    } catch (err: any) {
      console.error('[Login] Błąd autoryzacji e-mail:', err);
      Alert.alert('Błąd autoryzacji', err?.message || 'Niepoprawne dane logowania lub błąd sieci.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setOauthLoading(provider);
    try {
      await signInWithOAuth(provider);
      // Nawigacja powrotna po udanej autoryzacji (zostanie obsłużona przez deep link)
    } catch (err: any) {
      console.error(`[Login] Błąd logowania przez ${provider}:`, err);
      Alert.alert('Błąd logowania', `Nie udało się zalogować przez ${provider}: ${err?.message || 'błąd połączenia'}`);
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Przycisk wstecz */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </TouchableOpacity>

        {/* Sekcja Nagłówka */}
        <View style={styles.headerContainer}>
          <Text style={styles.appName}>Synapse AI</Text>
          <Text style={styles.title}>{isSignUp ? 'Utwórz konto' : 'Zaloguj się'}</Text>
          <Text style={styles.subtitle}>
            {isSignUp 
              ? 'Załóż darmowe konto, aby zapisywać notatki ze spotkań pod swoim e-mailem.' 
              : 'Wprowadź swoje dane lub skorzystaj z logowania społecznościowego.'}
          </Text>
        </View>

        {/* Przełącznik zakładki (Tabs) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, !isSignUp && styles.activeTab]}
            onPress={() => setIsSignUp(false)}
          >
            <Text style={[styles.tabText, !isSignUp && styles.activeTabText]}>Logowanie</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, isSignUp && styles.activeTab]}
            onPress={() => setIsSignUp(true)}
          >
            <Text style={[styles.tabText, isSignUp && styles.activeTabText]}>Rejestracja</Text>
          </TouchableOpacity>
        </View>

        {/* Formularz */}
        <View style={styles.formContainer}>
          {/* Imię (tylko przy rejestracji) */}
          {isSignUp && (
            <View>
              <Text style={styles.label}>Imię i nazwisko</Text>
              <TextInput
                style={[styles.input, nameFocused && styles.inputFocused]}
                placeholder="np. Przemysław Kowalski"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          )}

          {/* Email */}
          <Text style={[styles.label, isSignUp && { marginTop: 16 }]}>Adres E-mail</Text>
          <TextInput
            style={[styles.input, emailFocused && styles.inputFocused]}
            placeholder="np. przemyslaw@firma.pl"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Hasło */}
          <Text style={[styles.label, { marginTop: 16 }]}>Hasło</Text>
          <TextInput
            style={[styles.input, passwordFocused && styles.inputFocused]}
            placeholder="Min. 6 znaków"
            placeholderTextColor="#94A3B8"
            secureTextEntry={true}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Przycisk akcji logowania / rejestracji */}
          <TouchableOpacity 
            style={[styles.loginButton, (loading || oauthLoading) && styles.disabledButton]} 
            onPress={handleEmailAuth}
            disabled={loading || !!oauthLoading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>
                {isSignUp ? 'Zarejestruj się' : 'Zaloguj się'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Separator lub */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>LUB</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Przyciski społecznościowe (Google / Facebook) */}
        <View style={styles.oauthContainer}>
          {/* Przycisk Google */}
          <TouchableOpacity 
            style={[styles.oauthButton, styles.googleButton, (loading || oauthLoading) && styles.disabledButton]} 
            onPress={() => handleOAuth('google')}
            disabled={loading || !!oauthLoading}
            activeOpacity={0.85}
          >
            {oauthLoading === 'google' ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
                <Text style={styles.oauthButtonText}>Zaloguj przez Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Przycisk Facebook */}
          <TouchableOpacity 
            style={[styles.oauthButton, styles.facebookButton, (loading || oauthLoading) && styles.disabledButton]} 
            onPress={() => handleOAuth('facebook')}
            disabled={loading || !!oauthLoading}
            activeOpacity={0.85}
          >
            {oauthLoading === 'facebook' ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="logo-facebook" size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
                <Text style={styles.oauthButtonText}>Zaloguj przez Facebook</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Logowanie Google i Facebook przekierowuje do przeglądarki systemowej i zwraca bezpieczny token uwierzytelniający.
        </Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
    paddingRight: 16,
  },
  headerContainer: {
    marginBottom: 24,
  },
  appName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0EA5E9',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#0EA5E9',
    fontWeight: '700',
  },
  formContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0F172A',
  },
  inputFocused: {
    borderColor: '#0EA5E9',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 1,
  },
  loginButton: {
    backgroundColor: '#0EA5E9',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
    marginHorizontal: 16,
  },
  oauthContainer: {
    marginBottom: 32,
  },
  oauthButton: {
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  googleButton: {
    backgroundColor: '#EA4335', // Google brand red
    shadowColor: '#EA4335',
  },
  facebookButton: {
    backgroundColor: '#1877F2', // Facebook brand blue
    shadowColor: '#1877F2',
  },
  oauthButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerNote: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
});
