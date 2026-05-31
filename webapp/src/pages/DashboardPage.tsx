import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  LogOut, 
  Search, 
  RefreshCw, 
  Mic, 
  Calendar, 
  CheckSquare, 
  ChevronRight, 
  Trash2, 
  User,
  Inbox,
  Clock,
  CheckCircle2,
  FileText,
  Loader2
} from 'lucide-react'

interface Meeting {
  id: string
  title: string
  short_summary: string
  detailed_description: string | null
  transcription: string
  created_at: string
  actionItemsCount?: number
}

export default function DashboardPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Statystyki
  const [stats, setStats] = useState({
    totalMeetings: 0,
    openTasks: 0,
    completedTasks: 0,
  })

  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const userId = session.user.id
      setUser(session.user)

      // 1. Pobranie spotkań (należących do użytkownika lub starszych bez przypisanego id)
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order('created_at', { ascending: false })

      if (meetingsError) throw meetingsError

      // 2. Pobranie wszystkich action items dla statystyk
      const { data: itemsData, error: itemsError } = await supabase
        .from('action_items')
        .select('id, meeting_id, status')

      if (itemsError) throw itemsError

      const items = itemsData || []
      const meetingsList = (meetingsData || []).map((m: any) => {
        const count = items.filter((item: any) => item.meeting_id === m.id).length
        return { ...m, actionItemsCount: count }
      })

      // 3. Obliczanie statystyk
      const totalMeetings = meetingsList.length
      const completed = items.filter(
        (i: any) => i.status === 'Zakończony' || i.status === 'Completed' || i.status === 'done'
      ).length
      const open = items.length - completed

      setMeetings(meetingsList)
      setStats({
        totalMeetings,
        openTasks: open,
        completedTasks: completed,
      })
    } catch (err: any) {
      console.error('[DashboardPage] Błąd pobierania danych:', err)
      setError(err.message || 'Nie udało się pobrać danych z serwera.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDashboardData(true)
  }

  const handleLogout = async () => {
    if (window.confirm('Czy na pewno chcesz się wylogować?')) {
      await supabase.auth.signOut()
    }
  }

  const handleDeleteMeeting = async (meetingId: string, title: string) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć spotkanie "${title}"? Spowoduje to nieodwracalne skasowanie transkrypcji, analizy oraz zadań.`)) return

    try {
      // Usunięcie z bazy (kaskada usunie powiązane action_items oraz transcript_chunks)
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId)

      if (error) throw error

      // Usunięcie lokalne ze stanu
      setMeetings(prev => prev.filter(m => m.id !== meetingId))
      setStats(prev => ({
        ...prev,
        totalMeetings: prev.totalMeetings - 1
      }))
    } catch (err: any) {
      alert('Błąd usuwania: ' + err.message)
    }
  }

  const formatPolDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (e) {
      return dateStr
    }
  }

  const filteredMeetings = meetings.filter(m => {
    const query = searchQuery.toLowerCase()
    return (
      m.title.toLowerCase().includes(query) ||
      (m.short_summary && m.short_summary.toLowerCase().includes(query))
    )
  })

  const getUserDisplayName = () => {
    if (!user) return 'Użytkownik'
    return user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Użytkownik'
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/10">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">Synapse AI</span>
              <span className="text-[10px] block font-semibold text-indigo-600 uppercase tracking-widest leading-none mt-0.5">Desktop Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 border-r border-slate-200 pr-4">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-655 border border-slate-200">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900 leading-none">{getUserDisplayName()}</p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">{user?.email}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 hover:bg-rose-50 text-slate-655 hover:text-rose-600 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border border-transparent hover:border-rose-100 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Wyloguj</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col gap-6">
        {/* Powitanie i odświeżanie */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Witaj, {getUserDisplayName()}</h2>
            <p className="text-sm text-slate-500 font-medium">Zarządzaj swoimi naradami, transkrypcjami i zadaniami AI.</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-650' : ''}`} />
            Odśwież
          </button>
        </div>

        {/* Kafelki Statystyk */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center gap-4.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-slate-900">{stats.totalMeetings}</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Przeprowadzone Narady</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center gap-4.5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-amber-650">{stats.openTasks}</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Zadania W toku</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center gap-4.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-emerald-650">{stats.completedTasks}</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Zadania Ukończone</span>
            </div>
          </div>
        </div>

        {/* Wyszukiwarka */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            placeholder="Szukaj spotkania po tytule lub słowach kluczowych w podsumowaniu..."
            className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Informacja o błędzie bazy danych */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="font-bold text-rose-950 mb-1 text-base">Błąd połączenia z bazą danych</h3>
                <p className="text-sm text-rose-800 mb-4">
                  Wystąpił problem podczas pobierania spotkań: <code className="bg-rose-100/80 px-1.5 py-0.5 rounded font-mono text-xs text-rose-950 font-bold">{error}</code>
                </p>
                
                {/* Porada dotycząca brakującej migracji SQL */}
                <div className="bg-white/80 backdrop-blur-xs border border-rose-100 rounded-xl p-4 text-xs text-slate-700 leading-relaxed max-w-2xl">
                  <p className="font-bold text-slate-900 mb-1">Prawdopodobna przyczyna: brak kolumny `user_id` w tabeli `meetings`</p>
                  <p className="mb-3">
                    Aby aplikacja mogła odpytać bazę w trybie wielodostępnym, należy w bazie danych Supabase dodać kolumnę 
                    <code className="font-mono text-indigo-650 bg-slate-100 px-1 py-0.5 rounded mx-1">user_id</code> 
                    oraz włączyć zasady zabezpieczeń Row Level Security (RLS).
                  </p>
                  <p className="font-semibold text-slate-900 mb-2">Rozwiązanie:</p>
                  <ol className="list-decimal pl-4 space-y-1 mb-3">
                    <li>Zaloguj się do panelu <strong>Supabase Console</strong> i przejdź do swojego projektu.</li>
                    <li>Otwórz zakładkę <strong>SQL Editor</strong> i kliknij <strong>New Query</strong>.</li>
                    <li>Skopiuj i wklej skrypt SQL wdrożenia (znajdziesz go w planie implementacji lub dokumentacji).</li>
                    <li>Uruchom zapytanie przyciskiem <strong>Run</strong>, a następnie kliknij przycisk <strong>Odśwież</strong> powyżej.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista Spotkań */}
        {!error && (loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
            <p className="text-slate-500 font-semibold text-sm">Wczytywanie listy narad...</p>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-xs text-center p-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-5">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {searchQuery ? 'Brak wyników wyszukiwania' : 'Brak spotkań w historii'}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed mb-6">
              {searchQuery 
                ? 'Spróbuj wpisać inne słowa kluczowe lub zresetować filtry.' 
                : 'Użyj aplikacji mobilnej Synapse AI, aby nagrać swoje pierwsze spotkanie. Nagrania automatycznie pojawią się w tym panelu.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                Wyczyść wyszukiwanie
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMeetings.map((m) => (
              <div 
                key={m.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col group"
              >
                {/* Header karty */}
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatPolDate(m.created_at)}</span>
                    </div>
                    
                    {/* Przycisk usuwania */}
                    <button
                      onClick={() => handleDeleteMeeting(m.id, m.title)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                      title="Usuń spotkanie"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors text-base line-clamp-1 mb-2">
                    {m.title || 'Spotkanie bez tytułu'}
                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4 font-medium">
                    {m.short_summary || 'Brak podsumowania.'}
                  </p>
                </div>

                {/* Footer karty */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex items-center justify-between">
                  <div>
                    {m.actionItemsCount && m.actionItemsCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-150 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                        <CheckSquare className="w-3.5 h-3.5" />
                        {m.actionItemsCount} {m.actionItemsCount === 1 ? 'zadanie' : m.actionItemsCount < 5 ? 'zadania' : 'zadań'}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">Brak zadań</span>
                    )}
                  </div>

                  <Link
                    to={`/raport/${m.id}`}
                    className="inline-flex items-center gap-1 text-xs font-extrabold text-indigo-650 hover:text-indigo-700 transition-colors"
                  >
                    Szczegóły
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ))}`
      </main>
    </div>
  )
}
