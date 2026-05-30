import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing
} from 'react-native';
import { Audio } from 'expo-av';
import { uploadAudio } from '../services/api';
import { 
  saveActiveRecordingUri, 
  clearActiveRecordingUri, 
  persistRecordingToQueue, 
  syncQueue, 
  getQueue, 
  recoverCrashRecording, 
  removeFromQueue, 
  updateQueueItemStatus,
  QueueItem 
} from '../services/recordingQueue';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Meeting'>;

export default function MeetingScreen({ navigation }: Props) {
  const [transcribing, setTranscribing] = useState(false);
  
  // Stan nagrywania i kolejki
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [syncingQueue, setSyncingQueue] = useState(false);

  // Animacje przycisku nagrywania (Halo Effect)
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isRecording) {
      pulseAnim.setValue(0);
      animation = Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      );
      animation.start();
    } else {
      pulseAnim.setValue(0);
    }
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [isRecording]);

  // Inicjalizacja kolejki i odzyskiwanie z crasha
  useEffect(() => {
    const initQueueAndRecovery = async () => {
      try {
        const recovered = await recoverCrashRecording();
        if (recovered) {
          Alert.alert(
            'Odzyskano nagranie 🎤',
            'Wykryto przerwane nagranie z poprzedniej sesji. Zostało ono zapisane w kolejce lokalnej i wkrótce spróbujemy je wysłać.'
          );
        }
        const currentQueue = await getQueue();
        setQueueSize(currentQueue.length);

        // Jeśli są zaległe nagrania, wywołaj autoupload w tle
        if (currentQueue.length > 0) {
          triggerSyncBackground();
        }
      } catch (err) {
        console.error('[MeetingScreen] Błąd inicjalizacji kolejki:', err);
      }
    };
    initQueueAndRecovery();
  }, []);

  // Cleanup nagrywania przy odmontowaniu
  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  const triggerSyncBackground = async () => {
    if (syncingQueue) return;
    setSyncingQueue(true);
    try {
      await syncQueue(uploadAudio);
      const q = await getQueue();
      setQueueSize(q.length);
    } catch (err) {
      console.error('[MeetingScreen] Błąd automatycznej synchronizacji:', err);
    } finally {
      setSyncingQueue(false);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Brak uprawnień', 'Aplikacja potrzebuje dostępu do mikrofonu.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // AGRESYWNA KOMPRESJA (optymalizacja pod mowę i limity API)
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 32000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.MIN,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 32000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      
      // Zapisujemy ścieżkę tymczasową nagrania jako aktywną przed zmianą stanu UI
      const uri = recording.getURI();
      if (uri) {
        await saveActiveRecordingUri(uri);
      }

      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Błąd startu nagrywania:', err);
      Alert.alert('Błąd', 'Nie udało się rozpocząć nagrywania.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      // Kasujemy status aktywnego nagrywania (zakończone poprawnie)
      await clearActiveRecordingUri();

      if (uri) {
        // Przenosimy nagranie do bezpiecznej trwałej kolejki
        const queueItem = await persistRecordingToQueue(uri);
        const currentQueue = await getQueue();
        setQueueSize(currentQueue.length);
        
        // Próbujemy natychmiast wysłać
        await handleUploadQueueItem(queueItem, true);
      }
    } catch (err) {
      console.error('Błąd zatrzymania nagrywania:', err);
      await clearActiveRecordingUri();
    }
  };

  const handleUploadQueueItem = async (item: QueueItem, shouldNavigate: boolean) => {
    setTranscribing(true);
    try {
      console.log('[MeetingScreen] Rozpoczęcie wysyłki pliku audio z kolejki:', item.localUri);
      
      // Wysyłamy plik
      const result = await uploadAudio(item.localUri);
      
      if (result.status === 'success' || result.status === 'ok') {
        // Usuwamy plik z dysku i bazy dopiero po sukcesie
        await removeFromQueue(item.id);
        const q = await getQueue();
        setQueueSize(q.length);
        
        if (shouldNavigate) {
          navigation.navigate('AnalysisResult', {
            analysis: result.analysis,
            transcription: result.transcription,
            session_id: result.meeting_id || `session_${Date.now()}`,
            type: 'meeting_analysis',
            user_action_flags: { send_email: true, add_to_calendar: false },
            trace_id: result.trace_id || 'unknown'
          });
        }
      } else {
        throw new Error(result.message || 'Nieznany błąd serwera');
      }
    } catch (err: any) {
      console.error('[MeetingScreen] Błąd wysyłania audio z kolejki:', err);
      // Ustawiamy status jako błędny
      await updateQueueItemStatus(item.id, 'failed', err?.message || 'Błąd połączenia');
      
      if (shouldNavigate) {
        Alert.alert(
          'Zapisano lokalnie 💾', 
          'Nie udało się przesłać nagrania na serwer z powodu braku sieci lub przekroczenia limitu czasu. Zostało ono bezpiecznie zapisane na urządzeniu i zostanie przesłane automatycznie przy lepszym połączeniu.'
        );
      }
    } finally {
      setTranscribing(false);
    }
  };

  const triggerManualSync = async () => {
    if (syncingQueue) return;
    setSyncingQueue(true);
    try {
      console.log('[MeetingScreen] Ręczna synchronizacja kolejki...');
      const stats = await syncQueue(uploadAudio);
      const q = await getQueue();
      setQueueSize(q.length);

      if (stats.successCount > 0) {
        Alert.alert(
          'Synchronizacja ukończona 🎉',
          `Przesłano pomyślnie ${stats.successCount} zaległe nagranie(a).`
        );
      } else if (stats.failCount > 0) {
        Alert.alert(
          'Błąd synchronizacji',
          'Nie udało się przesłać nagrań. Sprawdź swoje połączenie internetowe.'
        );
      }
    } catch (err) {
      console.error('[MeetingScreen] Błąd podczas ręcznej synchronizacji:', err);
    } finally {
      setSyncingQueue(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Status kolejki lokalnej */}
        {queueSize > 0 && (
          <View style={styles.queueAlert}>
            <View style={styles.queueAlertLeft}>
              <Text style={styles.queueAlertIcon}>⚠️</Text>
              <Text style={styles.queueAlertText}>
                Masz {queueSize} {queueSize === 1 ? 'nieprzesłane nagranie' : queueSize < 5 ? 'nieprzesłane nagrania' : 'nieprzesłanych nagrań'} zapisane lokalnie z powodu braku sieci.
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.syncButton} 
              onPress={triggerManualSync}
              disabled={syncingQueue}
              activeOpacity={0.7}
            >
              {syncingQueue ? (
                <ActivityIndicator size="small" color="#D97706" />
              ) : (
                <Text style={styles.syncButtonText}>Wyślij</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Sekcja Nagrywania */}
        <View style={styles.recorderSection}>
          <View style={styles.micButtonContainer}>
            {/* Animowane pulsujące kręgi w tle (Halo Effect) */}
            {isRecording && (
              <>
                <Animated.View 
                  style={[
                    styles.haloCircle,
                    {
                      transform: [
                        {
                          scale: pulseAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.6],
                          }),
                        },
                      ],
                      opacity: pulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 0],
                      }),
                    },
                  ]}
                />
                <Animated.View 
                  style={[
                    styles.haloCircle,
                    {
                      transform: [
                        {
                          scale: pulseAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.3],
                          }),
                        },
                      ],
                      opacity: pulseAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, 0.3, 0],
                      }),
                    },
                  ]}
                />
              </>
            )}

            <TouchableOpacity 
              style={[
                styles.micButton, 
                isRecording && styles.micButtonRecording,
                (transcribing || syncingQueue) && styles.micButtonDisabled
              ]} 
              onPress={isRecording ? stopRecording : startRecording}
              disabled={transcribing || syncingQueue}
              activeOpacity={0.9}
            >
              {isRecording ? (
                // Stop icon morph
                <View style={styles.stopSymbol} />
              ) : transcribing ? (
                <ActivityIndicator size="large" color="#0EA5E9" />
              ) : (
                <Text style={styles.micIcon}>🎤</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <Text style={styles.micStatus}>
            {isRecording 
              ? 'Nagrywanie...' 
              : transcribing 
                ? 'Przetwarzanie AI w chmurze...' 
                : syncingQueue 
                  ? 'Wysyłanie zaległych nagrań...' 
                  : 'Naciśnij, aby zacząć nagrywać'}
          </Text>
          {(isRecording || transcribing || syncingQueue) && <ActivityIndicator size="small" color="#0EA5E9" style={{ marginTop: 10 }} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { padding: 20 },
  queueAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FEF3C7', // soft warning yellow (amber 100)
    borderColor: '#FCD34D', // amber 300
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  queueAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  queueAlertIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  queueAlertText: {
    color: '#92400E', // amber 800
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  syncButton: {
    backgroundColor: '#D97706', // amber 600
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  recorderSection: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  micButtonContainer: {
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  haloCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
  },
  stopSymbol: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  micButtonRecording: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOpacity: 0.4,
    borderColor: '#DC2626',
  },
  micButtonDisabled: {
    backgroundColor: '#E2E8F0',
    shadowColor: '#CBD5E1',
    elevation: 0,
    shadowOpacity: 0,
  },
  micIcon: { fontSize: 32 },
  micStatus: { color: '#475569', fontSize: 14, fontWeight: '600' },
});
