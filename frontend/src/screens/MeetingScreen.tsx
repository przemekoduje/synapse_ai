import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Switch, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Audio } from 'expo-av';
import { analyzeMeeting, uploadAudio } from '../services/api';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Meeting'>;

export default function MeetingScreen({ navigation }: Props) {
  const [transcription, setTranscription] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [loading, setLoading] = useState(false);
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
      const result = await uploadAudio(uri);
      if (result.status === 'ok') {
        setTranscription(prev => (prev ? prev + ' ' : '') + result.transcription);
      }
    } catch (err) {
      Alert.alert('Błąd transkrypcji', 'Nie udało się przetworzyć nagrania.');
    } finally {
      setTranscribing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!transcription.trim()) {
      Alert.alert('Błąd', 'Proszę wprowadzić treść transkrypcji (głosowo lub tekstowo).');
      return;
    }

    setLoading(true);
    try {
      const sessionId = `session_${Date.now()}`;
      const userFlags = { send_email: sendEmail, add_to_calendar: addToCalendar };

      const response = await analyzeMeeting(transcription, sessionId, userFlags);
      
      // Przejście do ekranu weryfikacji zamiast Alertu
      navigation.navigate('AnalysisResult', {
        analysis: response.analysis,
        transcription: transcription, // Dodajemy transkrypcję do parametrów
        session_id: sessionId,
        type: 'meeting_analysis',
        user_action_flags: userFlags,
        trace_id: response.trace_id
      });
      
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się połączyć z serwerem.');
    } finally {
      setLoading(false);
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
            style={[styles.micButton, isRecording && styles.micButtonRecording]} 
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Text style={styles.micIcon}>{isRecording ? '⏹️' : '🎤'}</Text>
          </TouchableOpacity>
          <Text style={styles.micStatus}>
            {isRecording ? 'Nagrywanie...' : transcribing ? 'Transkrypcja i wysyłka w toku...' : 'Naciśnij, aby zacząć nagrywać'}
          </Text>
          {(isRecording || transcribing) && <ActivityIndicator size="small" color="#0EA5E9" style={{ marginTop: 10 }} />}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Transkrypcja Spotkania</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Tekst pojawi się tutaj po nagraniu lub możesz go wpisać ręcznie..."
            placeholderTextColor="#64748B"
            multiline
            value={transcription}
            onChangeText={setTranscription}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Opcje Automatyzacji</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Wyślij podsumowanie e-mailem</Text>
            <Switch
              value={sendEmail}
              onValueChange={setSendEmail}
              trackColor={{ false: '#E2E8F0', true: '#0EA5E9' }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Dodaj zadania do kalendarza</Text>
            <Switch
              value={addToCalendar}
              onValueChange={setAddToCalendar}
              trackColor={{ false: '#E2E8F0', true: '#0EA5E9' }}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.analyzeButton, (loading || transcribing || isRecording) && styles.disabledButton]} 
          onPress={handleAnalyze}
          disabled={loading || transcribing || isRecording}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Analizuj i Wyślij</Text>
          )}
        </TouchableOpacity>
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
  micIcon: { fontSize: 32 },
  micStatus: { color: '#475569', fontSize: 14, fontWeight: '600' },
  section: { marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  textInput: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, color: '#1E293B', fontSize: 16, minHeight: 150, borderWidth: 1, borderColor: '#E2E8F0' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  switchLabel: { color: '#1E293B', fontSize: 15 },
  analyzeButton: { backgroundColor: '#0EA5E9', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  disabledButton: { backgroundColor: '#CBD5E1' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
