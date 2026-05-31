import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView, 
  Animated, 
  Easing, 
  Dimensions, 
  TouchableWithoutFeedback,
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Ionicons } from '@expo/vector-icons';
import { getQueue, syncQueue } from '../services/recordingQueue';
import { uploadAudio } from '../services/api';
import { getCurrentUser, logout } from '../services/auth';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();
  const incomingUrl = Linking.useURL();
  
  // Stany sesji i kolejki nagrań
  const [user, setUser] = useState<any>(null);
  const [queueSize, setQueueSize] = useState(0);
  const [syncingQueue, setSyncingQueue] = useState(false);

  // Nasłuchiwanie Deep Linków (OAuth callback)
  useEffect(() => {
    if (incomingUrl) {
      handleDeepLink(incomingUrl);
    }
  }, [incomingUrl]);

  const handleDeepLink = async (url: string) => {
    console.log('[HomeScreen] Obsługa incoming Deep Link URL:', url);
    try {
      const parsed = Linking.parse(url);
      const { code } = parsed.queryParams || {};
      if (code) {
        console.log('[HomeScreen] Znaleziono kod autoryzacji w URL, wymieniam na sesję...');
        const { error } = await supabase.auth.exchangeCodeForSession(String(code));
        if (error) throw error;
        console.log('[HomeScreen] Sesja pomyślnie zsynchronizowana z kodu PKCE!');
        await checkUser();
      }
    } catch (err) {
      console.error('[HomeScreen] Błąd przetwarzania deep linka:', err);
    }
  };

  // Sprawdzanie kolejki i użytkownika po wejściu na ekran
  useEffect(() => {
    if (isFocused) {
      checkQueue();
      checkUser();
    }
  }, [isFocused]);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error('[HomeScreen] Błąd sprawdzania użytkownika:', err);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Wylogowanie 👥',
      'Czy na pewno chcesz się wylogować?',
      [
        { text: 'Anuluj', style: 'cancel' },
        { 
          text: 'Wyloguj', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            setUser(null);
          }
        }
      ]
    );
  };

  const checkQueue = async () => {
    try {
      const q = await getQueue();
      setQueueSize(q.length);
    } catch (err) {
      console.error('[HomeScreen] Błąd sprawdzania kolejki:', err);
    }
  };

  const handleSyncQueue = async () => {
    if (syncingQueue) return;
    setSyncingQueue(true);
    try {
      console.log('[HomeScreen] Ręczna synchronizacja kolejki...');
      const stats = await syncQueue(uploadAudio);
      await checkQueue();
      
      if (stats.successCount > 0) {
        Alert.alert(
          'Synchronizacja ukończona 🎉',
          `Przesłano pomyślnie ${stats.successCount} zaległe nagranie(a).`
        );
      } else if (stats.failCount > 0) {
        Alert.alert(
          'Błąd synchronizacji ⚠️',
          'Nie udało się przesłać nagrań. Sprawdź swoje połączenie z internetem.'
        );
      }
    } catch (err) {
      console.error('[HomeScreen] Błąd podczas synchronizacji:', err);
    } finally {
      setSyncingQueue(false);
    }
  };

  // Stany dla animowanego Bottom Sheet
  const [isSheetRendered, setIsSheetRendered] = useState(false);
  
  // Wartości animacji
  const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  
  // Wartości animacji pulsującego okręgu (efekt halo)
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;

  // Uruchomienie animacji pulsującego okręgu
  useEffect(() => {
    const startPulse = () => {
      pulseScale.setValue(1);
      pulseOpacity.setValue(0.4);
      
      Animated.loop(
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 1.4,
            duration: 2200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 2200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          })
        ])
      ).start();
    };

    startPulse();
  }, []);

  // Funkcja pokazująca Bottom Sheet
  const showSheet = () => {
    setIsSheetRendered(true);
    
    // Równoległe animowanie tła i wysuwania szuflady
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(sheetAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();
  };

  // Funkcja ukrywająca Bottom Sheet
  const hideSheet = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(sheetAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      })
    ]).start(() => {
      setIsSheetRendered(false);
    });
  };

  const handleNavigate = (screen: 'Inspection' | 'Meeting' | 'QuickNote') => {
    // Ukryj szufladę przed przejściem
    hideSheet();
    // Nawigacja do odpowiedniego ekranu
    navigation.navigate(screen);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Alert o zaległych nagraniach w kolejce */}
      {queueSize > 0 && (
        <View style={styles.queueBanner}>
          <View style={styles.queueBannerLeft}>
            <Ionicons name="cloud-offline-outline" size={22} color="#92400E" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.queueBannerTitle}>Masz nieprzesłane nagrania ({queueSize})</Text>
              <Text style={styles.queueBannerDesc}>Zapisane lokalnie z powodu braku sieci.</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.syncBtn} 
            onPress={handleSyncQueue}
            disabled={syncingQueue}
            activeOpacity={0.7}
          >
            {syncingQueue ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.syncBtnText}>Wyślij</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      
      {/* Sekcja nagłówka - powitanie */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.greetingText}>
            {user ? `Dzień dobry, ${user.name}.` : 'Witaj w Synapse AI'}
          </Text>
          {user && (
            <TouchableOpacity style={styles.dashboardButton} onPress={() => navigation.navigate('History')} activeOpacity={0.7}>
              <Ionicons name="arrow-forward-outline" size={22} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.titleText}>
          {user ? 'Gotowy do pracy?' : 'Zaloguj się, aby rozpocząć'}
        </Text>
      </View>

      {/* Sugestia logowania dla gościa */}
      {!user && (
        <View style={styles.loginSuggestionBanner}>
          <View style={styles.loginSuggestionLeft}>
            <Ionicons name="person-circle-outline" size={24} color="#0EA5E9" style={{ marginRight: 10 }} />
            <Text style={styles.loginSuggestionText}>
              Zaloguj się, aby uzyskać dostęp do swojego dashboardu i historii.
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.loginBtn} 
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.loginBtnText}>Zaloguj</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sekcja centralna - czerwony przycisk */}
      <View style={styles.buttonContainer}>
        {/* Pulsujący okrąg w tle */}
        <Animated.View 
          style={[
            styles.pulseCircle, 
            {
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity
            }
          ]} 
        />
        
        {/* Główny przycisk startowy */}
        <TouchableOpacity 
          style={styles.mainButton} 
          onPress={showSheet}
          activeOpacity={0.85}
        >
          <View style={styles.innerBevel} />
        </TouchableOpacity>
      </View>

      {/* Sekcja dolna - instrukcja */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Dotknij, aby rozpocząć</Text>
      </View>

      {/* Animowany Bottom Sheet Overlay */}
      {isSheetRendered && (
        <View style={StyleSheet.absoluteFillObject}>
          
          {/* Ciemne tło maskujące */}
          <TouchableWithoutFeedback onPress={hideSheet}>
            <Animated.View 
              style={[
                styles.backdrop, 
                { opacity: backdropAnim }
              ]} 
            />
          </TouchableWithoutFeedback>

          {/* Wysuwany panel Bottom Sheet */}
          <Animated.View 
            style={[
              styles.bottomSheet, 
              { transform: [{ translateY: sheetAnim }] }
            ]}
          >
            <View style={styles.dragIndicator} />
            
            <Text style={styles.sheetTitle}>Wybierz tryb pracy</Text>
            <Text style={styles.sheetSubtitle}>Wybierz odpowiednie narzędzie AI, aby rozpocząć proces.</Text>

            {/* Opcja 1: Inspekcja Budowlana */}
            <TouchableOpacity 
              style={[styles.optionCard, styles.disabledOptionCard]}
              onPress={() => {}}
              disabled={true}
              activeOpacity={0.5}
            >
              <View style={[styles.iconContainer, styles.purpleIconBg]}>
                <Ionicons name="videocam" size={24} color="#7C3AED" />
              </View>
              <View style={styles.optionTextContainer}>
                <View style={styles.optionTitleContainer}>
                  <Text style={styles.optionTitle}>Inspekcja Budowlana</Text>
                  <View style={styles.badgeSoon}>
                    <Text style={styles.badgeSoonText}>Wkrótce</Text>
                  </View>
                </View>
                <Text style={styles.optionDesc}>Wideo z budowy, automatyczna detekcja usterek i raport AI.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* Opcja 2: Spotkanie Zespołowe */}
            <TouchableOpacity 
              style={styles.optionCard}
              onPress={() => handleNavigate('Meeting')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, styles.blueIconBg]}>
                <Ionicons name="mic" size={24} color="#0EA5E9" />
              </View>
              <View style={styles.optionTextContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  <Text style={styles.optionTitle}>Spotkanie Zespołowe</Text>
                  {queueSize > 0 && (
                    <View style={styles.inlineBadge}>
                      <Text style={styles.inlineBadgeText}>{queueSize} offline</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.optionDesc}>Nagrywanie audio spotkania, transkrypcja i notatki w mailu.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* Opcja 3: Szybka Notatka AI */}
            <TouchableOpacity 
              style={[styles.optionCard, styles.disabledOptionCard]}
              onPress={() => {}}
              disabled={true}
              activeOpacity={0.5}
            >
              <View style={[styles.iconContainer, styles.emeraldIconBg]}>
                <Ionicons name="document-text" size={24} color="#10B981" />
              </View>
              <View style={styles.optionTextContainer}>
                <View style={styles.optionTitleContainer}>
                  <Text style={styles.optionTitle}>Szybka Notatka AI</Text>
                  <View style={styles.badgeSoon}>
                    <Text style={styles.badgeSoonText}>Wkrótce</Text>
                  </View>
                </View>
                <Text style={styles.optionDesc}>Podyktuj szybką uwagę. AI natychmiast wygeneruje podsumowanie.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* Przycisk anuluj */}
            <TouchableOpacity style={styles.cancelButton} onPress={hideSheet}>
              <Text style={styles.cancelButtonText}>Anuluj</Text>
            </TouchableOpacity>
          </Animated.View>

        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    marginTop: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '400',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#EF4444',
  },
  mainButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 12,
  },
  innerBevel: {
    width: 188,
    height: 188,
    borderRadius: 94,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  footer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  
  // Style dla Bottom Sheet
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 24,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
    lineHeight: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  disabledOptionCard: {
    opacity: 0.5,
  },
  badgeSoon: {
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeSoonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  optionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  purpleIconBg: {
    backgroundColor: '#F5F3FF',
  },
  blueIconBg: {
    backgroundColor: '#F0F9FF',
  },
  emeraldIconBg: {
    backgroundColor: '#ECFDF5',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  queueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 16,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  queueBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  queueBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78350F',
  },
  queueBannerDesc: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 2,
  },
  syncBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  inlineBadge: {
    backgroundColor: '#D97706',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  inlineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
    marginBottom: 4,
  },
  dashboardButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 4,
  },
  loginSuggestionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 16,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  loginSuggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  loginSuggestionText: {
    color: '#0369A1',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  loginBtn: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
