import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  SafeAreaView,
  Platform
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import * as MailComposer from 'expo-mail-composer';
import * as Calendar from 'expo-calendar';

type Props = NativeStackScreenProps<RootStackParamList, 'AnalysisResult'>;

export default function AnalysisResultScreen({ route, navigation }: Props) {
  const { analysis, transcription, session_id, type, user_action_flags, trace_id } = route.params;
  
  console.log('[DEBUG] Otrzymano parametry w AnalysisResult:', { type, transcription: transcription?.substring(0, 50) + '...' });
  
  // Odczyt flag automatyzacji z parametrów trasy
  const flags = (user_action_flags || {}) as any;
  const shouldSendEmail = flags.hasOwnProperty('send_email') ? flags.send_email : true;
  const shouldAddToCalendar = flags.hasOwnProperty('add_to_calendar') ? flags.add_to_calendar : false;

  // Stan zaznaczonych zadań
  const [selectedTasks, setSelectedTasks] = useState<string[]>(analysis.action_items || []);
  const [loading, setLoading] = useState(false);
  const [calendarsList, setCalendarsList] = useState<any[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [calendarPermissionStatus, setCalendarPermissionStatus] = useState<string>('undetermined');

  // Wczytywanie kalendarzy
  React.useEffect(() => {
    if (shouldAddToCalendar) {
      const loadCalendars = async () => {
        try {
          const { status } = await Calendar.requestCalendarPermissionsAsync();
          setCalendarPermissionStatus(status);
          if (status === 'granted') {
            const list = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
            const writeable = list.filter(cal => cal.allowsModifications);
            setCalendarsList(writeable);
            if (writeable.length > 0) {
              const primary = writeable.find(cal => cal.isPrimary) || writeable[0];
              setSelectedCalendarId(primary.id);
            }
          }
        } catch (err) {
          console.error('[loadCalendars Error]', err);
        }
      };
      loadCalendars();
    }
  }, [shouldAddToCalendar]);

  const toggleTask = (task: string) => {
    if (selectedTasks.includes(task)) {
      setSelectedTasks(selectedTasks.filter(t => t !== task));
    } else {
      setSelectedTasks([...selectedTasks, task]);
    }
  };

  const createCalendarEventAsync = async (title: string, body: string) => {
    if (calendarPermissionStatus !== 'granted') {
      Alert.alert('Brak uprawnień', 'Nie można dodać wydarzenia bez dostępu do kalendarza.');
      return false;
    }

    const calendarId = selectedCalendarId;
    if (!calendarId) {
      Alert.alert('Brak kalendarza', 'Wybierz kalendarz z listy przed zapisaniem.');
      return false;
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 godzina trwania

    // Limitujemy długość opisu ze względu na ograniczenia kalendarza systemowego
    const truncatedNotes = body.length > 4000 ? body.substring(0, 3997) + '...' : body;

    await Calendar.createEventAsync(calendarId, {
      title: title,
      startDate: startDate,
      endDate: endDate,
      notes: truncatedNotes,
      timeZone: 'UTC',
    });
    return true;
  };

  const handleConfirm = async () => {
    if (selectedTasks.length === 0 && !analysis.short_summary) {
      Alert.alert('Błąd', 'Brak danych do wysłania.');
      return;
    }

    let success = true;
    setLoading(true);

    try {
      if (shouldAddToCalendar) {
        let calBody = `Podsumowanie:\n${analysis.short_summary}\n\n`;
        if (analysis.detailed_description) {
          calBody += `Opis:\n${analysis.detailed_description}\n\n`;
        }
        if (selectedTasks.length > 0) {
          calBody += `Zadania:\n`;
          selectedTasks.forEach(task => {
            calBody += `- ${task}\n`;
          });
          calBody += `\n`;
        }
        if (transcription) {
          calBody += `Transkrypcja rozmowy:\n${transcription}\n`;
        }

        const calSuccess = await createCalendarEventAsync(
          `Synapse AI: Raport ze spotkania`,
          calBody
        );
        if (!calSuccess) {
          success = false;
        }
      }

      if (success && shouldSendEmail) {
        const isAvailable = await MailComposer.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert('Błąd', 'Aplikacja pocztowa nie jest dostępna na tym urządzeniu.');
          setLoading(false);
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
      }

      if (success) {
        Alert.alert(
          'Automatyzacja ukończona', 
          'Wszystkie zaplanowane akcje zostały pomyślnie przetworzone.',
          [{ text: 'OK', onPress: () => navigation.popToTop() }]
        );
      }
    } catch (error) {
      console.error('[Automation Error]', error);
      Alert.alert('Błąd', 'Wystąpił problem w trakcie przetwarzania automatyzacji.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamiczne etykiety UI
  let dynamicButtonText = 'Zatwierdź i Zapisz';
  let dynamicInfoText = 'Zaznacz zadania do zapisania:';

  if (shouldSendEmail && shouldAddToCalendar) {
    dynamicButtonText = 'Zatwierdź i Wykonaj';
    dynamicInfoText = 'Zaznacz zadania, które chcesz wysłać na e-mail oraz zapisać w kalendarzu:';
  } else if (shouldSendEmail) {
    dynamicButtonText = 'Wyślij na E-mail';
    dynamicInfoText = 'Zaznacz zadania, które chcesz wysłać e-mailem:';
  } else if (shouldAddToCalendar) {
    dynamicButtonText = 'Zapisz w Kalendarzu';
    dynamicInfoText = 'Zaznacz zadania, które chcesz zapisać w kalendarzu:';
  }

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
          <Text style={styles.infoText}>{dynamicInfoText}</Text>
          
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

        {/* Sekcja Wyboru Kalendarza */}
        {shouldAddToCalendar && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Wybór Kalendarza</Text>
            {calendarPermissionStatus !== 'granted' ? (
              <Text style={styles.errorText}>
                {calendarPermissionStatus === 'denied' 
                  ? 'Brak uprawnień do kalendarza. Zezwól aplikacji na dostęp w ustawieniach telefonu.' 
                  : 'Trwa uzyskiwanie uprawnień do kalendarza...'}
              </Text>
            ) : calendarsList.length === 0 ? (
              <Text style={styles.errorText}>Nie znaleziono modyfikowalnych kalendarzy na tym urządzeniu.</Text>
            ) : (
              <>
                <Text style={styles.infoText}>Wybierz docelowy kalendarz dla zadania:</Text>
                {calendarsList.map((cal) => {
                  const isSelected = selectedCalendarId === cal.id;
                  return (
                    <TouchableOpacity
                      key={cal.id}
                      style={[styles.calendarRow, isSelected && styles.calendarRowSelected]}
                      onPress={() => setSelectedCalendarId(cal.id)}
                    >
                      <View style={[styles.radio, isSelected && styles.radioChecked]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.calendarTitle, isSelected && styles.calendarTitleSelected]}>
                          {cal.title}
                        </Text>
                        <Text style={styles.calendarSource}>
                          Źródło: {cal.source?.name || 'Lokalne'} ({Platform.OS === 'ios' ? 'iOS' : cal.type})
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* Przyciski Akcji */}
        <TouchableOpacity 
          style={[styles.confirmButton, loading && styles.disabledButton]} 
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.confirmButtonText}>{dynamicButtonText}</Text>
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { padding: 20 },
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
    color: '#0284C7',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  summaryText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    marginBottom: 10,
  },
  descriptionText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 22,
  },
  transcriptionText: {
    color: '#1E293B',
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
  findingBullet: { color: '#7C3AED', fontSize: 18, marginRight: 10 },
  findingText: { color: '#334155', fontSize: 14, flex: 1 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  taskRowSelected: {
    borderColor: '#0EA5E9',
    backgroundColor: '#F0F9FF',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  checkIcon: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  taskText: { color: '#475569', fontSize: 15, flex: 1 },
  taskTextSelected: { color: '#0F172A' },
  emptyText: { color: '#64748B', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  confirmButton: {
    backgroundColor: '#0EA5E9',
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  disabledButton: { backgroundColor: '#CBD5E1', shadowOpacity: 0 },
  cancelButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
  errorText: { color: '#EF4444', fontSize: 14, fontWeight: '600', textAlign: 'center', marginVertical: 10 },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calendarRowSelected: {
    borderColor: '#0EA5E9',
    backgroundColor: '#F0F9FF',
  },
  calendarTitle: { fontSize: 15, fontWeight: '600', color: '#475569' },
  calendarTitleSelected: { color: '#0F172A' },
  calendarSource: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioChecked: {
    borderColor: '#0EA5E9',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0EA5E9',
  },
});
