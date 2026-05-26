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
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  
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
      
      {/* Sekcja nagłówka - powitanie */}
      <View style={styles.header}>
        <Text style={styles.greetingText}>Dzień dobry, Przemysław.</Text>
        <Text style={styles.titleText}>Gotowy na inspekcję?</Text>
      </View>

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
                <Text style={styles.optionTitle}>Spotkanie Zespołowe</Text>
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
});
