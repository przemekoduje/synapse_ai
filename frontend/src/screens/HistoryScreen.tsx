import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { logout } from '../services/auth';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'History'>;

interface Meeting {
  id: string;
  title: string;
  short_summary: string;
  detailed_description: string | null;
  transcription: string;
  created_at: string;
  actionItemsCount?: number;
}

export default function HistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Statystyki
  const [stats, setStats] = useState({
    totalMeetings: 0,
    openTasks: 0,
    completedTasks: 0,
  });

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 1. Pobranie spotkań
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')
        .order('created_at', { ascending: false });

      if (meetingsError) throw meetingsError;

      // 2. Pobranie wszystkich action items dla statystyk
      const { data: itemsData, error: itemsError } = await supabase
        .from('action_items')
        .select('id, meeting_id, status');

      if (itemsError) throw itemsError;

      const items = itemsData || [];
      const meetingsList = (meetingsData || []).map((m: any) => {
        const count = items.filter((item: any) => item.meeting_id === m.id).length;
        return { ...m, actionItemsCount: count };
      });

      // 3. Obliczenie statystyk
      const totalMeetings = meetingsList.length;
      const completed = items.filter(
        (i: any) => i.status === 'Zakończony' || i.status === 'Completed' || i.status === 'done'
      ).length;
      const open = items.length - completed;

      setMeetings(meetingsList);
      setStats({
        totalMeetings,
        openTasks: open,
        completedTasks: completed,
      });
    } catch (err: any) {
      console.error('[HistoryScreen] Błąd pobierania danych:', err);
      Alert.alert('Błąd pobierania danych ⚠️', err.message || 'Nie udało się załadować historii.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Odświeżanie przy wejściu na ekran
  useEffect(() => {
    if (isFocused) {
      fetchData();
    }
  }, [isFocused, fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Wylogowanie 👥',
      'Czy na pewno chcesz się wylogować?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Wyloguj',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.navigate('Home');
          },
        },
      ]
    );
  };

  const formatPolDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Filtrowanie listy spotkań na podstawie wyszukiwania
  const filteredMeetings = meetings.filter((m) => {
    const query = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(query) ||
      (m.short_summary && m.short_summary.toLowerCase().includes(query))
    );
  });

  const renderMeetingCard = ({ item }: { item: Meeting }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('MeetingDetail', { meetingId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <View style={styles.iconWrapper}>
              <Ionicons name="mic-outline" size={20} color="#6366F1" />
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title || 'Spotkanie bez tytułu'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </View>

        {item.short_summary ? (
          <Text style={styles.cardSummary} numberOfLines={2}>
            {item.short_summary}
          </Text>
        ) : (
          <Text style={styles.cardSummaryEmpty}>Brak streszczenia.</Text>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>{formatPolDate(item.created_at)}</Text>
          {item.actionItemsCount && item.actionItemsCount > 0 ? (
            <View style={styles.tasksBadge}>
              <Ionicons name="checkbox-outline" size={12} color="#4F46E5" style={{ marginRight: 4 }} />
              <Text style={styles.tasksBadgeText}>
                {item.actionItemsCount} {item.actionItemsCount === 1 ? 'zadanie' : item.actionItemsCount < 5 ? 'zadania' : 'zadań'}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Nagłówek ekranu */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Panel Narad</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Widok statystyk */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{stats.totalMeetings}</Text>
          <Text style={styles.statLabel}>Narady</Text>
        </View>
        <View style={[styles.statCard, styles.statCardBorder]}>
          <Text style={[styles.statVal, { color: '#F59E0B' }]}>{stats.openTasks}</Text>
          <Text style={styles.statLabel}>W toku</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statVal, { color: '#10B981' }]}>{stats.completedTasks}</Text>
          <Text style={styles.statLabel}>Zakończone</Text>
        </View>
      </View>

      {/* Wyszukiwarka */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Szukaj spotkania..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Zawartość ekranu */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loaderText}>Wczytywanie historii...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMeetings}
          renderItem={renderMeetingCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#6366F1']}
              tintColor="#6366F1"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name={searchQuery ? 'search-outline' : 'mic-off-outline'}
                size={48}
                color="#CBD5E1"
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Brak wyników pasujących do wyszukiwania' : 'Brak nagranych spotkań'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => navigation.navigate('Home')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emptyBtnText}>Nagraj pierwsze spotkanie</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerBtn: {
    padding: 6,
    borderRadius: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statCardBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#F1F5F9',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  cardSummary: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardSummaryEmpty: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    paddingTop: 10,
  },
  cardDate: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  tasksBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tasksBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
