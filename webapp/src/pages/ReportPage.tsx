import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ChatAssistant from '../components/ChatAssistant'
import { 
  ChevronDown, 
  ChevronUp, 
  User, 
  FileText, 
  CheckSquare, 
  ClipboardList, 
  Edit3, 
  Trash2, 
  Plus, 
  Check, 
  X, 
  Loader2 
} from 'lucide-react'

interface Meeting {
  id: string
  title: string
  short_summary: string
  detailed_description: string | null
  transcription: string
  created_at: string
}

interface ActionItem {
  id: string
  meeting_id: string
  task_description: string
  assignee: string | null
  status: string
}

export default function ReportPage() {
  const { meeting_id } = useParams<{ meeting_id: string }>()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false)

  // Stan edycji ogólnej spotkania (tytuł, podsumowanie, opis)
  const [isEditingMeeting, setIsEditingMeeting] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [savingMeeting, setSavingMeeting] = useState(false)

  // Stan edycji poszczególnych zadań
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editTaskDesc, setEditTaskDesc] = useState('')
  const [editAssignee, setEditAssignee] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [savingItem, setSavingItem] = useState(false)

  // Stan nowego zadania
  const [showAddForm, setShowAddForm] = useState(false)
  const [newDesc, setNewDesc] = useState('')
  const [newAssignee, setNewAssignee] = useState('')
  const [newStatus, setNewStatus] = useState('Otwarty')
  const [addingItem, setAddingItem] = useState(false)

  useEffect(() => {
    async function fetchReportData() {
      if (!meeting_id) return
      setLoading(true)
      setError(null)

      try {
        // 1. Pobranie danych o spotkaniu
        const { data: meetingData, error: meetingError } = await supabase
          .from('meetings')
          .select('*')
          .eq('id', meeting_id)
          .single()

        if (meetingError) throw meetingError
        setMeeting(meetingData)
        setEditTitle(meetingData.title || '')
        setEditSummary(meetingData.short_summary || '')
        setEditDescription(meetingData.detailed_description || '')

        // 2. Pobranie powiązanych action items
        const { data: itemsData, error: itemsError } = await supabase
          .from('action_items')
          .select('*')
          .eq('meeting_id', meeting_id)

        if (itemsError) throw itemsError
        setActionItems(itemsData || [])
      } catch (err: any) {
        console.error('Błąd pobierania danych z Supabase:', err)
        setError(err.message || 'Nie udało się załadować raportu.')
      } finally {
        setLoading(false)
      }
    }

    fetchReportData()
  }, [meeting_id])

  // Zapis zmian w spotkaniu (Tytuł, podsumowanie, opis)
  const handleSaveMeeting = async () => {
    if (!meeting) return
    setSavingMeeting(true)
    try {
      const { error: updateError } = await supabase
        .from('meetings')
        .update({
          title: editTitle,
          short_summary: editSummary,
          detailed_description: editDescription
        })
        .eq('id', meeting.id)

      if (updateError) throw updateError

      setMeeting({
        ...meeting,
        title: editTitle,
        short_summary: editSummary,
        detailed_description: editDescription
      })
      setIsEditingMeeting(false)
    } catch (err: any) {
      alert('Błąd podczas zapisywania zmian: ' + err.message)
    } finally {
      setSavingMeeting(false)
    }
  }

  // Uruchomienie edycji zadania
  const startEditItem = (item: ActionItem) => {
    setEditingItemId(item.id)
    setEditTaskDesc(item.task_description)
    setEditAssignee(item.assignee || '')
    setEditStatus(item.status || 'Otwarty')
  }

  // Zapis zaktualizowanego zadania
  const handleSaveItem = async (id: string) => {
    setSavingItem(true)
    try {
      const { error: updateError } = await supabase
        .from('action_items')
        .update({
          task_description: editTaskDesc,
          assignee: editAssignee || null,
          status: editStatus
        })
        .eq('id', id)

      if (updateError) throw updateError

      setActionItems(actionItems.map(item => 
        item.id === id 
          ? { ...item, task_description: editTaskDesc, assignee: editAssignee || null, status: editStatus }
          : item
      ))
      setEditingItemId(null)
    } catch (err: any) {
      alert('Błąd podczas zapisywania zadania: ' + err.message)
    } finally {
      setSavingItem(false)
    }
  }

  // Szybka zmiana statusu zadania (kliknięciem w badge)
  const handleToggleStatus = async (item: ActionItem) => {
    const nextStatus = item.status === 'Completed' || item.status === 'done' || item.status === 'Zakończony' 
      ? 'Otwarty' 
      : 'Zakończony'
    try {
      const { error: updateError } = await supabase
        .from('action_items')
        .update({ status: nextStatus })
        .eq('id', item.id)

      if (updateError) throw updateError

      setActionItems(actionItems.map(ai => 
        ai.id === item.id ? { ...ai, status: nextStatus } : ai
      ))
    } catch (err: any) {
      alert('Błąd zmiany statusu: ' + err.message)
    }
  }

  // Usunięcie zadania
  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć to zadanie?')) return
    try {
      const { error: deleteError } = await supabase
        .from('action_items')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setActionItems(actionItems.filter(item => item.id !== id))
    } catch (err: any) {
      alert('Błąd podczas usuwania zadania: ' + err.message)
    }
  }

  // Dodanie nowego zadania
  const handleAddNewItem = async () => {
    if (!meeting_id || !newDesc.trim()) return
    setAddingItem(true)
    try {
      const { data, error: insertError } = await supabase
        .from('action_items')
        .insert({
          meeting_id: meeting_id,
          task_description: newDesc,
          assignee: newAssignee || null,
          status: newStatus
        })
        .select()

      if (insertError) throw insertError

      if (data && data.length > 0) {
        setActionItems([...actionItems, data[0]])
      }
      
      // Reset formularza
      setNewDesc('')
      setNewAssignee('')
      setNewStatus('Otwarty')
      setShowAddForm(false)
    } catch (err: any) {
      alert('Błąd podczas dodawania zadania: ' + err.message)
    } finally {
      setAddingItem(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error || !meeting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-red-600">
        <h2 className="text-xl font-semibold mb-2">Błąd ładowania raportu</h2>
        <p>{error || 'Nie odnaleziono spotkania o podanym identyfikatorze.'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 h-16 flex items-center justify-between px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-650 transition-colors font-bold text-sm">
            <span>←</span> Powrót do panelu
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-slate-900">Synapse AI Report Hub</span>
        </div>
        <button
          onClick={async () => {
            if (window.confirm('Czy na pewno chcesz się wylogować?')) {
              await supabase.auth.signOut()
            }
          }}
          className="flex items-center gap-1.5 hover:bg-rose-50 text-slate-550 hover:text-rose-600 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border border-transparent hover:border-rose-100 cursor-pointer"
        >
          Wyloguj
        </button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Lewa Kolumna: Czat RAG (30-40% szerokości) */}
      <aside className="w-full md:w-1/3 bg-white border-r border-slate-200 p-6 flex flex-col justify-between">
        <div className="h-full flex flex-col">
          <ChatAssistant meetingId={meeting.id} />
        </div>
      </aside>

      {/* Prawa Kolumna: Dane Spotkania (60-70% szerokości) */}
      <main className="flex-1 p-8 overflow-y-auto max-w-5xl mx-auto w-full">
        {/* Nagłówek */}
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          {isEditingMeeting ? (
            <div className="flex-1">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-3xl font-extrabold text-slate-950 w-full border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                placeholder="Tytuł spotkania"
              />
              <p className="text-xs text-slate-400">Data: {new Date(meeting.created_at).toLocaleString()}</p>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-extrabold text-slate-950 mb-1">{meeting.title || 'Spotkanie bez tytułu'}</h1>
              <p className="text-sm text-slate-500">Data: {new Date(meeting.created_at).toLocaleString()}</p>
            </div>
          )}

          <div className="flex items-center gap-2 self-start sm:self-center">
            {isEditingMeeting ? (
              <>
                <button
                  onClick={handleSaveMeeting}
                  disabled={savingMeeting}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {savingMeeting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Zapisz nagłówek
                </button>
                <button
                  onClick={() => {
                    setIsEditingMeeting(false)
                    setEditTitle(meeting.title || '')
                    setEditSummary(meeting.short_summary || '')
                    setEditDescription(meeting.detailed_description || '')
                  }}
                  className="flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  Anuluj
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditingMeeting(true)}
                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                Edytuj Spotkanie
              </button>
            )}
          </div>
        </header>

        {/* Sekcja: Podsumowanie AI */}
        <section className="mb-6 bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            Podsumowanie AI
          </h2>
          {isEditingMeeting ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Krótkie Podsumowanie
                </label>
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Krótkie streszczenie spotkania..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Szczegółowy Opis
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={6}
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Pełniejszy opis tematów, ustaleń i notatek..."
                />
              </div>
            </div>
          ) : (
            <div>
              <p className="text-slate-800 whitespace-pre-wrap text-sm leading-relaxed font-medium mb-4">
                {meeting.short_summary}
              </p>
              {meeting.detailed_description ? (
                <div className="border-t border-slate-100 pt-4 mt-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Szczegółowy opis
                  </h3>
                  <p className="text-slate-655 text-sm leading-relaxed whitespace-pre-wrap">
                    {meeting.detailed_description}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </section>

        {/* Sekcja: Zadania i Action Items */}
        <section className="mb-6 bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-600" />
              Zadania i Action Items
            </h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Dodaj zadanie
            </button>
          </div>

          {/* Formularz dodawania nowego zadania */}
          {showAddForm && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mb-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Nowe Zadanie</h3>
              <div>
                <input
                  type="text"
                  placeholder="Opis zadania..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Kto (Osoba odpowiedzialna)..."
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Otwarty">Otwarty</option>
                  <option value="W toku">W toku</option>
                  <option value="Zakończony">Zakończony</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-655 hover:bg-slate-200 rounded-md font-semibold transition-colors cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleAddNewItem}
                  disabled={addingItem || !newDesc.trim()}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs rounded-md font-semibold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {addingItem ? 'Dodawanie...' : 'Dodaj zadanie'}
                </button>
              </div>
            </div>
          )}
          
          {actionItems.length > 0 ? (
            <div className="grid gap-3">
              {actionItems.map((item) => {
                const isEditingThis = editingItemId === item.id

                return (
                  <div 
                    key={item.id} 
                    className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between gap-3"
                  >
                    {isEditingThis ? (
                      <div className="space-y-3 w-full">
                        <input
                          type="text"
                          value={editTaskDesc}
                          onChange={(e) => setEditTaskDesc(e.target.value)}
                          className="w-full text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                          <input
                            type="text"
                            placeholder="Osoba odpowiedzialna"
                            value={editAssignee}
                            onChange={(e) => setEditAssignee(e.target.value)}
                            className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="Otwarty">Otwarty</option>
                            <option value="W toku">W toku</option>
                            <option value="Zakończony">Zakończony</option>
                          </select>
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveItem(item.id)}
                              disabled={savingItem}
                              className="bg-green-600 hover:bg-green-700 text-white p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Zapisz"
                            >
                              {savingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setEditingItemId(null)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Anuluj"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">{item.task_description}</p>
                          {item.assignee && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full w-fit">
                              <User className="w-3.5 h-3.5" />
                              <span>{item.assignee}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {/* Klikalny status pozwalający szybko zakończyć zadanie */}
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className={`px-2.5 py-1 text-xs rounded-full font-semibold border transition-all hover:scale-105 cursor-pointer ${
                              item.status === 'Zakończony' || item.status === 'Completed' || item.status === 'done'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : item.status === 'W toku'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-yellow-50 text-yellow-700 border-yellow-300'
                            }`}
                            title="Kliknij, aby przełączyć status"
                          >
                            {item.status || 'Otwarty'}
                          </button>
                          
                          {/* Edycja / Usuwanie */}
                          <button
                            onClick={() => startEditItem(item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-650 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Edytuj zadanie"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-slate-550 hover:text-red-650 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Usuń zadanie"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">Brak zidentyfikowanych zadań z tego spotkania.</p>
          )}
        </section>

        {/* Sekcja: Rozwijana Transkrypcja */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <button
            onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Pełna Transkrypcja Narady</span>
            </div>
            {isTranscriptOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </button>
          
          {isTranscriptOpen && (
            <div className="p-6 border-t border-slate-200 bg-white">
              <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed max-h-[400px] overflow-y-auto pr-2">
                {meeting.transcription}
              </p>
            </div>
          )}
        </section>
      </main>
      </div>
    </div>
  )
}
