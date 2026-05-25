import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import * as MailComposer from 'expo-mail-composer';

type Props = NativeStackScreenProps<RootStackParamList, 'AnalysisResult'>;

export default function AnalysisResultScreen({ route, navigation }: Props) {
  const { analysis, transcription, session_id, type, user_action_flags, trace_id } = route.params;
  
  console.log('[DEBUG] Otrzymano parametry w AnalysisResult:', { type, transcription: transcription?.substring(0, 50) + '...' });
  // Stan zaznaczonych zadań
  const [selectedTasks, setSelectedTasks] = useState<string[]>(analysis.action_items || []);
  const [loading, setLoading] = useState(false);

  const toggleTask = (task: string) => {
    if (selectedTasks.includes(task)) {
      setSelectedTasks(selectedTasks.filter(t => t !== task));
    } else {
      setSelectedTasks([...selectedTasks, task]);
    }
  };

  const handleConfirm = async () => {
    if (selectedTasks.length === 0 && !analysis.short_summary) {
      Alert.alert('Błąd', 'Brak danych do wysłania.');
      return;
    }

    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Błąd', 'Aplikacja pocztowa nie jest dostępna na tym urządzeniu.');
        return;
      }

      let body = `Podsumowanie:\n${analysis.short_summary}\n\n`;
      if (analysis.detailed_description) {
        body += `Opis:\n${analysis.detailed_description}\n\n`;
      }
      
      if (selectedTasks.length > 0) {
        body += `Zadania do wykonania:\n`;
        selectedTasks.forEach(task => {
          body += `- ${task}\n`;
        });
      }

      await MailComposer.composeAsync({
        subject: `Synapse AI: Raport z ${type === 'audio' ? 'nagrania' : 'wideo'}`,
        body: body,
      });

      navigation.popToTop();
    } catch (error) {
      Alert.alert('Błąd', 'Wystąpił problem przy generowaniu wiadomości e-mail.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Sekcja Podsumowania */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Podsumowanie Analizy</Text>
          <Text style={styles.summaryText}>{analysis.short_summary}</Text>
          {analysis.detailed_description && (
            <Text style={styles.descriptionText}>{analysis.detailed_description}</Text>
          )}
        </View>

        {/* Sekcja Kluczowych Wniosków (dla Wideo) */}
        {analysis.key_findings && analysis.key_findings.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Kluczowe Obserwacje</Text>
            {analysis.key_findings.map((finding: string, index: number) => (
              <View key={index} style={styles.findingRow}>
                <Text style={styles.findingBullet}>•</Text>
                <Text style={styles.findingText}>{finding}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Sekcja Surowej Transkrypcji (Diarization) */}
        {transcription && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pełny Zapis Rozmowy (Role)</Text>
            <Text style={styles.transcriptionText}>{transcription}</Text>
          </View>
        )}

        {/* Sekcja Zadań (Action Items) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Zadania do Wykonania</Text>
          <Text style={styles.infoText}>Zaznacz punkty, które chcesz wysłać do n8n:</Text>
          
          {analysis.action_items && analysis.action_items.length > 0 ? (
            analysis.action_items.map((task: string, index: number) => {
              const isSelected = selectedTasks.includes(task);
              return (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.taskRow, isSelected && styles.taskRowSelected]} 
                  onPress={() => toggleTask(task)}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                  </View>
                  <Text style={[styles.taskText, isSelected && styles.taskTextSelected]}>
                    {task}
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.emptyText}>Nie wykryto konkretnych zadań.</Text>
          )}
        </View>

        {/* Przyciski Akcji */}
        <TouchableOpacity 
          style={[styles.confirmButton, loading && styles.disabledButton]} 
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Wyślij na E-mail</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Anuluj i wróć</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scrollContent: { padding: 20 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0EA5E9',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  summaryText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    marginBottom: 10,
  },
  descriptionText: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 22,
  },
  transcriptionText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  infoText: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 15,
  },
  findingRow: { flexDirection: 'row', marginBottom: 8 },
  findingBullet: { color: '#A855F7', fontSize: 18, marginRight: 10 },
  findingText: { color: '#CBD5E1', fontSize: 14, flex: 1 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  taskRowSelected: {
    borderColor: '#0EA5E9',
    backgroundColor: '#1E293B',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  checkIcon: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  taskText: { color: '#94A3B8', fontSize: 15, flex: 1 },
  taskTextSelected: { color: '#F8FAFC' },
  emptyText: { color: '#64748B', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  confirmButton: {
    backgroundColor: '#0EA5E9',
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  disabledButton: { backgroundColor: '#334155', shadowOpacity: 0 },
  cancelButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: { color: '#64748B', fontSize: 15, fontWeight: '600' },
});
