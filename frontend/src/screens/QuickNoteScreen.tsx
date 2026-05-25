import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  Animated, 
  Easing,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

type Props = NativeStackScreenProps<RootStackParamList, 'QuickNote'>;

export default function QuickNoteScreen({ navigation }: Props) {
  const [noteText, setNoteText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Animacje dla fali dźwiękowej
  const waveAnim1 = useRef(new Animated.Value(1)).current;
  const waveAnim2 = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Efekt pulsujący wokół przycisku podczas nagrywania
  useEffect(() => {
    let animationLoop: Animated.CompositeAnimation | null = null;
    
    if (isRecording) {
      // Sekwencja animacji dla fal dźwiękowych
      const animateWave = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 2.2,
              duration: 1200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 1.0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
      };

      animationLoop = Animated.parallel([
        animateWave(waveAnim1, 0),
        Animated.sequence([
          Animated.delay(600),
          animateWave(waveAnim2, 600),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1.0,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        )
      ]);

      animationLoop.start();
    } else {
      waveAnim1.setValue(1);
      waveAnim2.setValue(1);
      pulseAnim.setValue(1);
    }

    return () => {
      if (animationLoop) {
        animationLoop.stop();
      }
    };
  }, [isRecording]);

  const handleToggleRecording = () => {
    if (isRecording) {
      // Zatrzymanie nagrywania - symulacja transkrypcji
      setIsRecording(false);
      setNoteText("Zauważono pęknięcie na ścianie nośnej w sektorze B, na poziomie +1. Wymagane pilne sprawdzenie przez kierownika budowy przed wylaniem kolejnego stropu.");
    } else {
      // Rozpoczęcie nagrywania
      setIsRecording(true);
      setNoteText('');
    }
  };

  const handleSend = () => {
    if (!noteText.trim()) {
      Alert.alert('Błąd', 'Najpierw nagraj notatkę lub wpisz ją ręcznie.');
      return;
    }

    setAnalyzing(true);
    // Symulacja analizy AI i automatycznej wysyłki
    setTimeout(() => {
      setAnalyzing(false);
      Alert.alert(
        'Notatka Przetworzona',
        'AI przeanalizowało notatkę. Zadania zostały wysłane e-mailem jako podsumowanie.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    }, 2000);
  };

  // Interpolacja dla fal dźwiękowych (skala i krycie)
  const waveScale1 = waveAnim1;
  const waveOpacity1 = waveAnim1.interpolate({
    inputRange: [1, 2.2],
    outputRange: [0.6, 0]
  });

  const waveScale2 = waveAnim2;
  const waveOpacity2 = waveAnim2.interpolate({
    inputRange: [1, 2.2],
    outputRange: [0.6, 0]
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Szybka Notatka AI</Text>
          <Text style={styles.subtitle}>Podyktuj uwagi z terenu, a AI automatycznie prześle raport i przydzieli zadania.</Text>
        </View>

        {/* Sekcja wizualizacji nagrywania */}
        <View style={styles.recorderContainer}>
          <View style={styles.waveWrapper}>
            {isRecording && (
              <>
                <Animated.View 
                  style={[
                    styles.waveHalo, 
                    { transform: [{ scale: waveScale1 }], opacity: waveOpacity1 }
                  ]} 
                />
                <Animated.View 
                  style={[
                    styles.waveHalo, 
                    { transform: [{ scale: waveScale2 }], opacity: waveOpacity2 }
                  ]} 
                />
              </>
            )}
            
            <AnimatedTouchableOpacity 
              style={[
                styles.recordButton, 
                isRecording ? styles.recordButtonActive : styles.recordButtonInactive,
                { transform: [{ scale: pulseAnim }] }
              ]}
              onPress={handleToggleRecording}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={isRecording ? "stop" : "mic"} 
                size={38} 
                color="#FFFFFF" 
              />
            </AnimatedTouchableOpacity>
          </View>
          
          <Text style={[styles.statusText, isRecording && styles.statusTextActive]}>
            {isRecording ? 'NAGRYWANIE NOTATKI...' : 'Dotknij przycisku, aby nagrywać'}
          </Text>
        </View>

        {/* Pole tekstowe z notatką */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>TREŚĆ NOTATKI</Text>
          <TextInput
            style={styles.textInput}
            value={noteText}
            onChangeText={setNoteText}
            multiline
            placeholder="Wypowiedziane słowa pojawią się tutaj automatycznie. Możesz je też edytować przed wysłaniem..."
            placeholderTextColor="#94A3B8"
            textAlignVertical="top"
          />
        </View>

        {/* Przycisk akcji */}
        <TouchableOpacity 
          style={[styles.sendButton, (!noteText.trim() || isRecording) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!noteText.trim() || isRecording || analyzing}
        >
          {analyzing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.sendButtonText}>Prześlij i Analizuj</Text>
              <Ionicons name="send" size={18} color="#FFFFFF" style={styles.sendIcon} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 20,
  },
  recorderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  waveWrapper: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveHalo: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#34D399',
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  recordButtonInactive: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  recordButtonActive: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  statusTextActive: {
    color: '#EF4444',
  },
  inputContainer: {
    flex: 1,
    marginVertical: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    color: '#0F172A',
    fontSize: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sendButton: {
    backgroundColor: '#0F172A',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sendIcon: {
    marginLeft: 8,
  },
});
