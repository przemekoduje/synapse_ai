import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Keyboard,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { askQuestion } from '../services/api';

interface ActionItem {
  id: string;
  meeting_id: string;
  task_description: string;
  assignee: string | null;
  status: string;
}

interface Meeting {
  id: string;
  title: string;
  short_summary: string;
  detailed_description: string | null;
  transcription: string;
  created_at: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

type TabType = 'summary' | 'tasks' | 'chat' | 'transcript';

export default function MeetingDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { meetingId } = route.params;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  // Stany edycji nagłówka/podsumowania
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingMeeting, setSavingMeeting] = useState(false);

  // Stany edycji/dodawania zadań
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editStatus, setEditStatus] = useState('Otwarty');
  const [savingItem, setSavingItem] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState('Otwarty');
  const [addingItem, setAddingItem] = useState(false);

  // Stany czatu AI
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: 'Cześć! Jestem Twoim asystentem AI. Zadaj mi dowolne pytanie dotyczące tego spotkania (np. ustaleń, terminów lub szczegółów), a odpowiem na podstawie transkrypcji.',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const chatFlatListRef = useRef<FlatList>(null);

  // Pobranie danych o spotkaniu i zadaniach
  const loadMeetingData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Pobierz spotkanie
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (meetingError) throw meetingError;
      setMeeting(meetingData);
      setEditTitle(meetingData.title || '');
      setEditSummary(meetingData.short_summary || '');
      setEditDescription(meetingData.detailed_description || '');

      // 2. Pobierz zadania
      const { data: itemsData, error: itemsError } = await supabase
        .from('action_items')
        .select('*')
        .eq('meeting_id', meetingId);

      if (itemsError) throw itemsError;
      setActionItems(itemsData || []);
    } catch (err: any) {
      console.error('[MeetingDetailScreen] Błąd wczytywania:', err);
      Alert.alert('Błąd wczytywania ⚠️', err.message || 'Nie udało się załadować szczegółów narady.');
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    loadMeetingData();
  }, [loadMeetingData]);

  // Formatowanie daty
  const formatPolDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Zapis zmian w spotkaniu (Tytuł, podsumowanie, szczegółowy opis)
  const handleSaveMeeting = async () => {
    if (!meeting) return;
    setSavingMeeting(true);
    try {
      const { error } = await supabase
        .from('meetings')
        .update({
          title: editTitle,
          short_summary: editSummary,
          detailed_description: editDescription,
        })
        .eq('id', meetingId);

      if (error) throw error;

      setMeeting({
        ...meeting,
        title: editTitle,
        short_summary: editSummary,
        detailed_description: editDescription,
      });
      setIsEditing(false);
      Alert.alert('Sukces 🎉', 'Zapisano zmiany w spotkaniu.');
    } catch (err: any) {
      Alert.alert('Błąd zapisu ⚠️', err.message || 'Nie udało się zapisać zmian.');
    } finally {
      setSavingMeeting(false);
    }
  };

  // Oznaczanie statusu zadania (Szybki Checkbox / Badge)
  const handleToggleStatus = async (item: ActionItem) => {
    const nextStatus =
      item.status === 'Zakończony' || item.status === 'Completed' || item.status === 'done'
        ? 'Otwarty'
        : 'Zakończony';

    // OPTYMISTYCZNE AKTUALIZOWANIE UI
    const previousItems = [...actionItems];
    setActionItems((prev) =>
      prev.map((ai) => (ai.id === item.id ? { ...ai, status: nextStatus } : ai))
    );

    try {
      const { error } = await supabase
        .from('action_items')
        .update({ status: nextStatus })
        .eq('id', item.id);

      if (error) throw error;
    } catch (err: any) {
      console.error('[MeetingDetailScreen] Błąd zmiany statusu:', err);
      // Cofnięcie zmiany w razie błędu sieciowego
      setActionItems(previousItems);
      Alert.alert('Błąd sieci ⚠️', 'Nie udało się zmienić statusu zadania.');
    }
  };

  // Usuwanie zadania
  const handleDeleteItem = (itemId: string) => {
    Alert.alert('Usuwanie zadania ⚠️', 'Czy na pewno chcesz usunąć to zadanie?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          // OPTYMISTYCZNE AKTUALIZOWANIE UI
          const previousItems = [...actionItems];
          setActionItems((prev) => prev.filter((ai) => ai.id !== itemId));

          try {
            const { error } = await supabase.from('action_items').delete().eq('id', itemId);
            if (error) throw error;
          } catch (err: any) {
            console.error('[MeetingDetailScreen] Błąd usuwania zadania:', err);
            // Przywrócenie stanu w razie błędu
            setActionItems(previousItems);
            Alert.alert('Błąd sieci ⚠️', 'Nie udało się usunąć zadania.');
          }
        },
      },
    ]);
  };

  // Zapis edytowanego zadania
  const handleSaveItem = async (itemId: string) => {
    setSavingItem(true);
    try {
      const { error } = await supabase
        .from('action_items')
        .update({
          task_description: editTaskDesc,
          assignee: editAssignee || null,
          status: editStatus,
        })
        .eq('id', itemId);

      if (error) throw error;

      setActionItems((prev) =>
        prev.map((ai) =>
          ai.id === itemId
            ? { ...ai, task_description: editTaskDesc, assignee: editAssignee || null, status: editStatus }
            : ai
        )
      );
      setEditingItemId(null);
    } catch (err: any) {
      Alert.alert('Błąd zapisu zadania ⚠️', err.message || 'Nie udało się zaktualizować zadania.');
    } finally {
      setSavingItem(false);
    }
  };

  const startEditItem = (item: ActionItem) => {
    setEditingItemId(item.id);
    setEditTaskDesc(item.task_description);
    setEditAssignee(item.assignee || '');
    setEditStatus(item.status);
  };

  // Dodanie nowego zadania
  const handleAddNewItem = async () => {
    if (!newTaskDesc.trim()) return;
    setAddingItem(true);
    try {
      const { data, error } = await supabase
        .from('action_items')
        .insert({
          meeting_id: meetingId,
          task_description: newTaskDesc,
          assignee: newTaskAssignee || null,
          status: newTaskStatus,
        })
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setActionItems((prev) => [...prev, data[0]]);
      }

      // Reset
      setNewTaskDesc('');
      setNewTaskAssignee('');
      setNewTaskStatus('Otwarty');
      setShowAddForm(false);
    } catch (err: any) {
      Alert.alert('Błąd dodawania zadania ⚠️', err.message || 'Nie udało się utworzyć nowego zadania.');
    } finally {
      setAddingItem(false);
    }
  };

  // Obsługa wysyłki wiadomości do RAG czatu
  const handleSendMessage = async () => {
    if (!chatInput.trim() || aiTyping) return;
    const textToSend = chatInput;
    setChatInput('');
    Keyboard.dismiss();

    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      text: textToSend,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setAiTyping(true);

    try {
      // Wywołanie endpointu /ask
      const response = await askQuestion(meetingId, textToSend);
      
      const aiMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        text: response.answer || 'Brak odpowiedzi ze strony asystenta.',
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('[MeetingDetailScreen] Błąd czatu RAG:', err);
      const errorMsg: Message = {
        id: `msg_err_${Date.now()}`,
        text: 'Przepraszam, wystąpił problem techniczny podczas komunikacji z bazą wiedzy AI.',
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setAiTyping(false);
    }
  };

  // Automatyczne przewijanie czatu do dołu po dodaniu wiadomości
  useEffect(() => {
    if (activeTab === 'chat' && messages.length > 0) {
      setTimeout(() => {
        chatFlatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, activeTab]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Wczytywanie szczegółów narady...</Text>
      </View>
    );
  }

  if (!meeting) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" style={{ marginBottom: 12 }} />
        <Text style={styles.errorText}>Nie odnaleziono podanego spotkania.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Wróć do listy</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Górny pasek nawigacji zakładkowej */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'summary' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('summary');
            setIsEditing(false);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text" size={18} color={activeTab === 'summary' ? '#4F46E5' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>Podsumowanie</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'tasks' && styles.tabButtonActive]}
          onPress={() => setActiveTab('tasks')}
          activeOpacity={0.7}
        >
          <Ionicons name="checkbox" size={18} color={activeTab === 'tasks' ? '#4F46E5' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>Zadania</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'chat' && styles.tabButtonActive]}
          onPress={() => setActiveTab('chat')}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubbles" size={18} color={activeTab === 'chat' ? '#4F46E5' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>Czat AI</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'transcript' && styles.tabButtonActive]}
          onPress={() => setActiveTab('transcript')}
          activeOpacity={0.7}
        >
          <Ionicons name="receipt" size={18} color={activeTab === 'transcript' ? '#4F46E5' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'transcript' && styles.tabTextActive]}>Tekst</Text>
        </TouchableOpacity>
      </View>

      {/* GŁÓWNA ZAWARTOŚĆ ZAKŁADEK */}
      <View style={{ flex: 1 }}>
        
        {/* ZAKŁADKA 1: PODSUMOWANIE */}
        {activeTab === 'summary' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <View style={styles.cardHeaderWithAction}>
                <Text style={styles.sectionHeaderTitle}>Metadane Spotkania</Text>
                {isEditing ? (
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity
                      style={[styles.miniBtn, styles.saveBtn]}
                      onPress={handleSaveMeeting}
                      disabled={savingMeeting}
                    >
                      {savingMeeting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.miniBtn, styles.cancelBtn]} onPress={() => setIsEditing(false)}>
                      <Ionicons name="close" size={16} color="#475569" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.editBtnOutline} onPress={() => setIsEditing(true)}>
                    <Ionicons name="create-outline" size={14} color="#4F46E5" style={{ marginRight: 4 }} />
                    <Text style={styles.editBtnOutlineText}>Edytuj</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isEditing ? (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Tytuł Spotkania</Text>
                  <TextInput
                    style={styles.input}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="Tytuł spotkania"
                  />
                  <Text style={styles.dateLabel}>Utworzono: {formatPolDate(meeting.created_at)}</Text>
                </View>
              ) : (
                <View style={styles.summaryMetaContainer}>
                  <Text selectable={true} style={styles.detailTitle}>{meeting.title || 'Spotkanie bez tytułu'}</Text>
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.dateText}>{formatPolDate(meeting.created_at)}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>Krótkie Podsumowanie AI</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={editSummary}
                  onChangeText={setEditSummary}
                  placeholder="Napisz krótkie podsumowanie..."
                  multiline
                  numberOfLines={4}
                />
              ) : (
                <Text selectable={true} style={styles.summaryText}>
                  {meeting.short_summary || 'Brak podsumowania.'}
                </Text>
              )}
            </View>

            {isEditing ? (
              <View style={styles.card}>
                <Text style={styles.cardSectionTitle}>Szczegółowy Opis Spotkania</Text>
                <TextInput
                  style={[styles.input, styles.textarea, { height: 160 }]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Wpisz szczegółowy opis spotkania..."
                  multiline
                  numberOfLines={8}
                />
              </View>
            ) : (
              meeting.detailed_description && (
                <View style={styles.card}>
                  <Text style={styles.cardSectionTitle}>Szczegółowe Ustalenia</Text>
                  <Text selectable={true} style={styles.detailedDescText}>{meeting.detailed_description}</Text>
                </View>
              )
            )}
          </ScrollView>
        )}

        {/* ZAKŁADKA 2: ACTION ITEMS (ZADANIA) */}
        {activeTab === 'tasks' && (
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              
              {/* Formularz szybkiego dodawania zadania */}
              <View style={[styles.card, { marginBottom: 16 }]}>
                <TouchableOpacity
                  style={styles.addAccordionHeader}
                  onPress={() => setShowAddForm(!showAddForm)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={showAddForm ? 'close-circle-outline' : 'add-circle-outline'} size={22} color="#4F46E5" style={{ marginRight: 8 }} />
                    <Text style={styles.addAccordionTitle}>{showAddForm ? 'Zamknij formularz' : 'Dodaj nowe zadanie'}</Text>
                  </View>
                  <Ionicons name={showAddForm ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
                </TouchableOpacity>

                {showAddForm && (
                  <View style={styles.addFormContainer}>
                    <Text style={styles.label}>Opis zadania</Text>
                    <TextInput
                      style={styles.input}
                      value={newTaskDesc}
                      onChangeText={setNewTaskDesc}
                      placeholder="Co jest do zrobienia..."
                    />

                    <View style={styles.rowInputs}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.label}>Osoba przypisana</Text>
                        <TextInput
                          style={styles.input}
                          value={newTaskAssignee}
                          onChangeText={setNewTaskAssignee}
                          placeholder="Np. Jan Kowalski"
                        />
                      </View>
                      <View style={{ width: 120 }}>
                        <Text style={styles.label}>Status</Text>
                        <View style={styles.pickerWrapper}>
                          <TouchableOpacity
                            style={styles.pickerSelect}
                            onPress={() => {
                              const next = newTaskStatus === 'Otwarty' ? 'W toku' : newTaskStatus === 'W toku' ? 'Zakończony' : 'Otwarty';
                              setNewTaskStatus(next);
                            }}
                          >
                            <Text style={styles.pickerText}>{newTaskStatus}</Text>
                            <Ionicons name="swap-vertical" size={12} color="#64748B" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.submitBtn, !newTaskDesc.trim() && styles.submitBtnDisabled]}
                      onPress={handleAddNewItem}
                      disabled={addingItem || !newTaskDesc.trim()}
                      activeOpacity={0.8}
                    >
                      {addingItem ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.submitBtnText}>Zapisz zadanie</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Lista Zadań */}
              <Text style={styles.taskListTitle}>Zidentyfikowane zadania ({actionItems.length})</Text>

              {actionItems.length === 0 ? (
                <View style={styles.emptyTasksContainer}>
                  <Ionicons name="checkbox-outline" size={40} color="#CBD5E1" style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyTasksText}>Brak zadań przypisanych do tej narady.</Text>
                </View>
              ) : (
                actionItems.map((item) => {
                  const isEditingThis = editingItemId === item.id;
                  const isDone = item.status === 'Zakończony' || item.status === 'Completed' || item.status === 'done';

                  return (
                    <View key={item.id} style={[styles.taskCard, isDone && styles.taskCardCompleted]}>
                      {isEditingThis ? (
                        // FORMULARZ EDYCJI ZADANIA
                        <View style={{ width: '100%' }}>
                          <Text style={styles.label}>Opis zadania</Text>
                          <TextInput
                            style={styles.input}
                            value={editTaskDesc}
                            onChangeText={setEditTaskDesc}
                          />

                          <View style={styles.rowInputs}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                              <Text style={styles.label}>Osoba przypisana</Text>
                              <TextInput
                                style={styles.input}
                                value={editAssignee}
                                onChangeText={setEditAssignee}
                                placeholder="Np. Jan Kowalski"
                              />
                            </View>
                            <View style={{ width: 120 }}>
                              <Text style={styles.label}>Status</Text>
                              <View style={styles.pickerWrapper}>
                                <TouchableOpacity
                                  style={styles.pickerSelect}
                                  onPress={() => {
                                    const next = editStatus === 'Otwarty' ? 'W toku' : editStatus === 'W toku' ? 'Zakończony' : 'Otwarty';
                                    setEditStatus(next);
                                  }}
                                >
                                  <Text style={styles.pickerText}>{editStatus}</Text>
                                  <Ionicons name="swap-vertical" size={12} color="#64748B" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>

                          <View style={styles.editActionsRow}>
                            <TouchableOpacity
                              style={[styles.miniActionBtn, styles.saveItemBtn]}
                              onPress={() => handleSaveItem(item.id)}
                              disabled={savingItem}
                            >
                              {savingItem ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <>
                                  <Ionicons name="checkmark-sharp" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                                  <Text style={styles.miniActionText}>Zapisz</Text>
                                </>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.miniActionBtn, styles.cancelItemBtn]}
                              onPress={() => setEditingItemId(null)}
                            >
                              <Text style={[styles.miniActionText, { color: '#475569' }]}>Anuluj</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        // WIDOK ZWYKŁY ZADANIA
                        <View style={styles.taskCardContent}>
                          <View style={styles.taskLeftSection}>
                            {/* Checkbox statusu */}
                            <TouchableOpacity
                              style={[styles.checkbox, isDone && styles.checkboxChecked]}
                              onPress={() => handleToggleStatus(item)}
                              activeOpacity={0.7}
                            >
                              {isDone && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                            </TouchableOpacity>

                            <View style={styles.taskDetails}>
                              <Text style={[styles.taskDesc, isDone && styles.taskDescCompleted]}>
                                {item.task_description}
                              </Text>

                              <View style={styles.taskMetaRow}>
                                {item.assignee && (
                                  <View style={styles.assigneeBadge}>
                                    <Ionicons name="person-outline" size={11} color="#475569" style={{ marginRight: 4 }} />
                                    <Text style={styles.assigneeText}>{item.assignee}</Text>
                                  </View>
                                )}
                                <View
                                  style={[
                                    styles.statusLabel,
                                    item.status === 'W toku' && styles.statusInProg,
                                    isDone && styles.statusDone,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.statusLabelText,
                                      item.status === 'W toku' && styles.statusInProgText,
                                      isDone && styles.statusDoneText,
                                    ]}
                                  >
                                    {item.status}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>

                          {/* Akcje - edycja/usuwanie */}
                          <View style={styles.taskActions}>
                            <TouchableOpacity style={styles.actionIconButton} onPress={() => startEditItem(item)}>
                              <Ionicons name="create-outline" size={18} color="#4F46E5" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionIconButton} onPress={() => handleDeleteItem(item.id)}>
                              <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}

        {/* ZAKŁADKA 3: CZAT AI RAG */}
        {activeTab === 'chat' && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            style={{ flex: 1 }}
          >
            <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
              <FlatList
                ref={chatFlatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.chatListContent}
                renderItem={({ item }) => {
                  const isUser = item.sender === 'user';
                  return (
                    <View style={[styles.chatBubbleContainer, isUser ? styles.bubbleUserAlign : styles.bubbleAiAlign]}>
                      {!isUser && (
                        <View style={styles.chatAvatar}>
                          <Ionicons name="logo-android" size={14} color="#FFFFFF" />
                        </View>
                      )}
                      <View style={[styles.chatBubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
                        <Text selectable={true} style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAi]}>
                          {item.text}
                        </Text>
                      </View>
                    </View>
                  );
                }}
                ListFooterComponent={
                  aiTyping ? (
                    <View style={[styles.chatBubbleContainer, styles.bubbleAiAlign]}>
                      <View style={styles.chatAvatar}>
                        <Ionicons name="logo-android" size={14} color="#FFFFFF" />
                      </View>
                      <View style={[styles.chatBubble, styles.bubbleAi, styles.typingBubble]}>
                        <ActivityIndicator size="small" color="#4F46E5" style={{ marginRight: 6 }} />
                        <Text style={styles.typingText}>Asystent szuka w transkrypcji...</Text>
                      </View>
                    </View>
                  ) : null
                }
              />

              {/* Dolny input wpisywania pytań */}
              <View style={styles.chatInputContainer}>
                <TextInput
                  style={styles.chatTextInput}
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Zapytać o terminy lub ustalenia..."
                  placeholderTextColor="#94A3B8"
                  multiline={false}
                  onSubmitEditing={handleSendMessage}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  style={[styles.chatSendBtn, !chatInput.trim() && styles.chatSendBtnDisabled]}
                  onPress={handleSendMessage}
                  disabled={!chatInput.trim() || aiTyping}
                  activeOpacity={0.8}
                >
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* ZAKŁADKA 4: TRANSKRYPCJA */}
        {activeTab === 'transcript' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <View style={styles.transcriptionHeader}>
                <Text style={styles.cardSectionTitle}>Pełny Zapis Dźwięku</Text>
                <Text style={styles.infoSmall}>Możesz kopiować zaznaczony tekst.</Text>
              </View>
              {meeting.transcription ? (
                <Text selectable={true} style={styles.transcriptionText}>
                  {meeting.transcription}
                </Text>
              ) : (
                <Text style={styles.transcriptionTextEmpty}>Brak zapisu transkrypcji.</Text>
              )}
            </View>
          </ScrollView>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 32,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    height: 48,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    paddingVertical: 6,
    flexDirection: 'column',
  },
  tabButtonActive: {
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  tabTextActive: {
    color: '#6366F1',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    paddingBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  editBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EEF2FF',
  },
  editBtnOutlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  miniBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  saveBtn: {
    backgroundColor: '#10B981',
  },
  cancelBtn: {
    backgroundColor: '#E2E8F0',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    fontWeight: '500',
  },
  detailedDescText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  // Klawiatura i Formularze
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  formGroup: {
    width: '100%',
  },
  // Zakładka Zadania (Tasks)
  addAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  addAccordionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  addFormContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    paddingTop: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  pickerSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    height: 38,
  },
  pickerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  submitBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#A5B4FC',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  taskListTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  emptyTasksContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTasksText: {
    color: '#94A3B8',
    fontSize: 13,
    fontStyle: 'italic',
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  taskCardCompleted: {
    borderColor: '#F1F5F9',
    opacity: 0.75,
  },
  taskCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  taskLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#A5B4FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  taskDetails: {
    flex: 1,
  },
  taskDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 18,
  },
  taskDescCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  assigneeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  assigneeText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '700',
  },
  statusLabel: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
    textTransform: 'uppercase',
  },
  statusInProg: {
    backgroundColor: '#EFF6FF',
  },
  statusInProgText: {
    color: '#1D4ED8',
  },
  statusDone: {
    backgroundColor: '#D1FAE5',
  },
  statusDoneText: {
    color: '#047857',
  },
  taskActions: {
    flexDirection: 'row',
  },
  actionIconButton: {
    padding: 6,
    marginLeft: 4,
  },
  editActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  miniActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  saveItemBtn: {
    backgroundColor: '#10B981',
  },
  cancelItemBtn: {
    backgroundColor: '#E2E8F0',
  },
  miniActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Zakładka Czat RAG (Chat)
  chatListContent: {
    padding: 16,
    paddingBottom: 24,
  },
  chatBubbleContainer: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
    width: '100%',
  },
  bubbleUserAlign: {
    justifyContent: 'flex-end',
  },
  bubbleAiAlign: {
    justifyContent: 'flex-start',
  },
  chatAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  chatBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  bubbleUser: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 2,
  },
  bubbleAi: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bubbleText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  bubbleTextUser: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bubbleTextAi: {
    color: '#1E293B',
    fontWeight: '500',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    maxHeight: 80,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  chatSendBtnDisabled: {
    backgroundColor: '#C7D2FE',
  },
  // Zakładka Transkrypcja (Transcript)
  transcriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    paddingBottom: 8,
  },
  infoSmall: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  transcriptionText: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 22,
    fontWeight: '500',
  },
  transcriptionTextEmpty: {
    fontSize: 13.5,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  summaryMetaContainer: {
    paddingVertical: 4,
  },
});
