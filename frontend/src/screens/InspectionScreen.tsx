import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  SafeAreaView 
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { uploadVideoInspection } from '../services/api';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Inspection'>;

export default function InspectionScreen({ navigation }: Props) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  
  const [isRecording, setIsRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!cameraPermission || !micPermission) {
    return <View />;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Wymagane uprawnienia do kamery i mikrofonu.</Text>
        <TouchableOpacity 
          style={styles.permissionButton} 
          onPress={() => {
            requestCameraPermission();
            requestMicPermission();
          }}
        >
          <Text style={styles.buttonText}>Przyznaj uprawnienia</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleRecord = async () => {
    if (cameraRef.current) {
      if (isRecording) {
        setIsRecording(false);
        cameraRef.current.stopRecording();
      } else {
        setIsRecording(true);
        try {
          const video = await cameraRef.current.recordAsync({
            maxDuration: 60, // Limit 60 sekund dla bezpieczeństwa/kosztów
            quality: '480p', // Agresywna kompresja na wejściu
          } as any);
          
          if (video?.uri) {
            handleUpload(video.uri);
          }
        } catch (err) {
          console.error('Błąd nagrywania:', err);
          setIsRecording(false);
        }
      }
    }
  };

  const handleUpload = async (uri: string) => {
    setAnalyzing(true);
    try {
      const response = await uploadVideoInspection(uri);
      
      // Przejście do ekranu weryfikacji zamiast Alertu
      navigation.navigate('AnalysisResult', {
        analysis: response.analysis,
        transcription: response.transcription, // Przekazujemy transkrypcję z wideo
        session_id: `vid_${Date.now()}`,
        type: 'video_inspection',
        user_action_flags: {}, // W inspekcji wideo flagi mogą być rozszerzone w przyszłości
        trace_id: response.trace_id
      });

    } catch (err) {
      Alert.alert('Błąd', 'Nie udało się przeanalizować wideo.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CameraView 
        style={styles.camera} 
        ref={cameraRef}
        mode="video"
      >
        <View style={styles.overlay}>
          <View style={styles.controls}>
            {analyzing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#A855F7" />
                <Text style={styles.loadingText}>Analiza multimodalna...</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.recordButton, isRecording && styles.recordButtonActive]} 
                onPress={handleRecord}
              >
                <View style={isRecording ? styles.stopIcon : styles.recordIcon} />
              </TouchableOpacity>
            )}
            <Text style={styles.statusText}>
              {isRecording ? 'NAGRYWANIE' : 'GOTOWY'}
            </Text>
          </View>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A', padding: 20 },
  permissionText: { color: '#F8FAFC', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  permissionButton: { backgroundColor: '#A855F7', padding: 15, borderRadius: 12 },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end', paddingBottom: 40 },
  controls: { alignItems: 'center' },
  recordButton: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  recordButtonActive: { borderColor: '#EF4444' },
  recordIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#EF4444' },
  stopIcon: { width: 30, height: 30, borderRadius: 4, backgroundColor: '#EF4444' },
  statusText: { color: '#FFF', marginTop: 10, fontWeight: '700', letterSpacing: 1 },
  loadingContainer: { backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: 20, borderRadius: 20, alignItems: 'center' },
  loadingText: { color: '#F8FAFC', marginTop: 10, fontWeight: '600' },
  buttonText: { color: '#FFF', fontWeight: '700' },
});
