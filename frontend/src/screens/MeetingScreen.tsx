import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Audio } from 'expo-av';
import { uploadAudio } from '../services/api';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Meeting'>;

export default function MeetingScreen({ navigation }: Props) {
  const [transcribing, setTranscribing] = useState(false);
  
  // Stan nagrywania
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    return () => {
      // Cleanup nagrywania przy odmontowaniu
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

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

      if (uri) {
        handleUploadAudio(uri);
      }
    } catch (err) {
      console.error('Błąd zatrzymania nagrywania:', err);
    }
  };

  const handleUploadAudio = async (uri: string) => {
    setTranscribing(true);
    try {
      console.log('[MeetingScreen] Rozpoczęcie wysyłki pliku audio:', uri);
      const result = await uploadAudio(uri);
      if (result.status === 'success' || result.status === 'ok') {
        Alert.alert(
          'Sukces',
          'Nagranie zostało przesłane do analizy na serwerze.',
          [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
        );
      } else {
        throw new Error(result.message || 'Nieznany błąd serwera');
      }
    } catch (err: any) {
      console.error('[MeetingScreen] Błąd wysyłania audio:', err);
      Alert.alert(
        'Błąd transkrypcji', 
        'Nie udało się przesłać nagrania na serwer. Upewnij się, że serwer backendu działa i spróbuj ponownie.'
      );
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Sekcja Nagrywania */}
        <View style={styles.recorderSection}>
          <TouchableOpacity 
            style={[
              styles.micButton, 
              isRecording && styles.micButtonRecording,
              transcribing && styles.micButtonDisabled
            ]} 
            onPress={isRecording ? stopRecording : startRecording}
            disabled={transcribing}
          >
            <Text style={styles.micIcon}>{isRecording ? '⏹️' : '🎤'}</Text>
          </TouchableOpacity>
          <Text style={styles.micStatus}>
            {isRecording 
              ? 'Nagrywanie...' 
              : transcribing 
                ? 'Przesyłanie nagrania na serwer...' 
                : 'Naciśnij, aby zacząć nagrywać'}
          </Text>
          {(isRecording || transcribing) && <ActivityIndicator size="small" color="#0EA5E9" style={{ marginTop: 10 }} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { padding: 20 },
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
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 12,
  },
  micButtonRecording: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    transform: [{ scale: 1.1 }],
  },
  micButtonDisabled: {
    backgroundColor: '#E2E8F0',
    shadowColor: '#CBD5E1',
  },
  micIcon: { fontSize: 32 },
  micStatus: { color: '#475569', fontSize: 14, fontWeight: '600' },
});
