import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, AlertCircle } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant' | 'error'
  content: string
}

interface ChatAssistantProps {
  meetingId: string
}

export default function ChatAssistant({ meetingId }: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Cześć! Jestem gotowy odpowiedzieć na pytania dotyczące tego spotkania. O co chciałbyś zapytać?'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

  // Automatyczne przewijanie czatu do najnowszej wiadomości
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userQuestion = input.trim()
    setInput('')
    setIsLoading(true)

    // Dodanie pytania użytkownika do stanu
    setMessages(prev => [...prev, { role: 'user', content: userQuestion }])

    try {
      const response = await fetch(`${backendUrl}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meeting_id: meetingId,
          question: userQuestion
        })
      })

      if (!response.ok) {
        throw new Error(`Błąd serwera: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.status === 'success' || data.answer) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.answer }])
      } else {
        throw new Error(data.message || 'Nieznany błąd serwera.')
      }
    } catch (err: any) {
      console.error('Błąd czatu RAG:', err)
      setMessages(prev => [
        ...prev,
        {
          role: 'error',
          content: `Nie udało się uzyskać odpowiedzi. ${err.message || 'Sprawdź połączenie z backendem.'}`
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Nagłówek czatu */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
        <Bot className="w-5 h-5 text-indigo-600" />
        <div>
          <h2 className="text-sm font-bold text-slate-800">Asystent Synapse</h2>
          <p className="text-[10px] text-slate-500 font-medium">Silnik RAG (Zero Halucynacji)</p>
        </div>
      </div>

      {/* Okno wiadomości */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[350px] max-h-[500px]">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-3 max-w-[85%] ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            {/* Ikona nadawcy */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-105 text-indigo-700 bg-indigo-100' 
                : msg.role === 'error'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-700'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Treść wiadomości */}
            <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-none'
                : msg.role === 'error'
                  ? 'bg-red-50 text-red-850 border border-red-200 flex items-center gap-2 rounded-tl-none text-red-800'
                  : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-none'
            }`}>
              {msg.role === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto items-center">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 bg-slate-100 rounded-2xl rounded-tl-none border border-slate-200 flex items-center gap-2 text-slate-500 text-xs">
              <div className="flex space-x-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span>Analizowanie transkrypcji...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Formularz wprowadzania pytania */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-slate-50 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Zapytaj o szczegóły narady..."
          disabled={isLoading}
          className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-750 disabled:bg-indigo-300 text-white rounded-lg p-2 flex items-center justify-center cursor-pointer transition-colors hover:bg-indigo-700"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
