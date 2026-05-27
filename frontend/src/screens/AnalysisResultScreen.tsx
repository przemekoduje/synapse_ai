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
  const { analysis, transcription, session_id, type } = route.params;
  const [loading, setLoading] = useState(false);

  const handleSendEmail = async () => {
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Błąd', 'Aplikacja pocztowa nie jest dostępna na tym urządzeniu.');
        return;
      }

      setLoading(true);

      const title = `Synapse AI: Raport ze spotkania`;
      let emailBody = `PODSUMOWANIE SPOTKANIA\n`;
      emailBody += `======================\n\n`;
      emailBody += `${analysis.short_summary || ''}\n\n`;

      if (analysis.detailed_description) {
        emailBody += `SZCZEGÓŁOWY OPIS\n`;
        emailBody += `----------------\n`;
        emailBody += `${analysis.detailed_description}\n\n`;
      }

      if (analysis.action_items && analysis.action_items.length > 0) {
        emailBody += `ZADANIA I AKCJE (ACTION ITEMS)\n`;
        emailBody += `------------------------------\n`;
        analysis.action_items.forEach((item: any) => {
          const itemText = typeof item === 'object' && item !== null
            ? `${item.task_description || ''}${item.assignee ? ` [Przypisane do: ${item.assignee}]` : ''}`
            : String(item);
          emailBody += `- ${itemText}\n`;
        });
        emailBody += `\n`;
      }

      const webappUrl = process.env.EXPO_PUBLIC_WEBAPP_URL || 'https://app.concore.ai';
      emailBody += `Pełny raport, nagranie oraz czat asystenta są dostępne pod poniższym adresem:\n`;
      emailBody += `${webappUrl}/raport/${session_id}\n`;

      await MailComposer.composeAsync({
        subject: title,
        body: emailBody,
        recipients: [], // Puste adresy zgodnie z wymaganiami
      });

    } catch (err: any) {
      console.error('[Mail Error]', err);
      Alert.alert('Błąd', 'Nie udało się otworzyć klienta pocztowego.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Nagłówek */}
        <View style={styles.header}>
          <Text style={styles.badge}>{type === 'inspection_video' ? 'WIDEO INSPEKCJA' : 'SPOTKANIE'}</Text>
          <Text style={styles.title}>Analiza Zakończona</Text>
          <Text style={styles.subtitle}>Dane zostały pomyślnie zapisane w chmurze Supabase.</Text>
        </View>

        {/* Karta Podsumowania */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Podsumowanie AI</Text>
          <Text style={styles.summaryText}>{analysis.short_summary || 'Brak podsumowania.'}</Text>
          {analysis.detailed_description ? (
            <Text style={styles.descriptionText}>{analysis.detailed_description}</Text>
          ) : null}
        </View>

        {/* Karta Zadań */}
        {analysis.action_items && analysis.action_items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Zidentyfikowane Zadania</Text>
            {analysis.action_items.map((task: any, index: number) => {
              const taskText = typeof task === 'object' && task !== null
                ? task.task_description
                : String(task);
              const assignee = typeof task === 'object' && task !== null && task.assignee
                ? task.assignee
                : null;
              
              return (
                <View key={index} style={styles.taskRow}>
                  <Text style={styles.taskBullet}>•</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskText}>{taskText}</Text>
                    {assignee ? (
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                        👤 {assignee}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Sekcja Akcji */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.emailButton, loading && styles.disabledButton]} 
            onPress={handleSendEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.emailButtonText}>✉️ Wyślij E-mail (Opcja A)</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.finishButton} 
            onPress={handleFinish}
            disabled={loading}
          >
            <Text style={styles.finishButtonText}>✔️ Zakończ i Wróć (Opcja B)</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { padding: 24 },
  header: { marginBottom: 24, alignItems: 'center' },
  badge: {
    backgroundColor: '#E0F2FE',
    color: '#0369A1',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    letterSpacing: 1,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 10,
  },
  descriptionText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
  },
  taskRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' },
  taskBullet: { color: '#0EA5E9', fontSize: 18, marginRight: 10, lineHeight: 18 },
  taskText: { color: '#334155', fontSize: 14, flex: 1, lineHeight: 20 },
  actionsContainer: { marginTop: 10 },
  emailButton: {
    backgroundColor: '#0EA5E9',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  emailButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disabledButton: { backgroundColor: '#94A3B8' },
  finishButton: {
    backgroundColor: '#F1F5F9',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  finishButtonText: { color: '#475569', fontSize: 16, fontWeight: '700' },
});
