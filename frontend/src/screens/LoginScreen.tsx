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
  StatusBar
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { login } from '../services/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEmail = (text: string) => {
    const reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    return reg.test(text);
  };

  const handleLogin = async () => {
    if (!name.trim()) {
      Alert.alert('Brak danych', 'Proszę podać swoje imię.');
      return;
    }
    if (!email.trim() || !validateEmail(email)) {
      Alert.alert('Błędny e-mail', 'Proszę podać poprawny adres e-mail.');
      return;
    }

    setLoading(true);
    try {
      await login(name, email);
      // Powrót do ekranu głównego
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (err) {
      console.error('[Login] Błąd logowania:', err);
      Alert.alert('Błąd', 'Nie udało się zalogować. Spróbuj ponownie.');
    } finally {
      setLoading(false);
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
          <Text style={styles.backButtonText}>← Powrót</Text>
        </TouchableOpacity>

        {/* Sekcja Nagłówka */}
        <View style={styles.headerContainer}>
          <Text style={styles.appName}>Synapse AI</Text>
          <Text style={styles.title}>Zaloguj się</Text>
          <Text style={styles.subtitle}>Wprowadź swoje dane, aby uzyskać dostęp do indywidualnego dashboardu i historii.</Text>
        </View>

        {/* Formularz */}
        <View style={styles.formContainer}>
          {/* Imię */}
          <Text style={styles.label}>Twoje Imię</Text>
          <TextInput
            style={[styles.input, nameFocused && styles.inputFocused]}
            placeholder="np. Przemysław"
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            autoCapitalize="words"
            autoCorrect={false}
          />

          {/* Email */}
          <Text style={[styles.label, { marginTop: 16 }]}>Adres E-mail</Text>
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

          {/* Przycisk logowania */}
          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.disabledButton]} 
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Logowanie...' : 'Zaloguj się'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Twoje dane będą przechowywane lokalnie i posłużą do automatycznego uzupełniania pól e-mail w raportach.
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
    paddingTop: 40,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 32,
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  headerContainer: {
    marginBottom: 32,
  },
  appName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0EA5E9',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 22,
  },
  formContainer: {
    marginBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    fontSize: 16,
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
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  footerNote: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
