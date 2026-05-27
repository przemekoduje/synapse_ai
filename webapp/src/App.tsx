import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ReportPage from './pages/ReportPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-150 p-8 max-w-md w-full text-center">
              <h1 className="text-3xl font-extrabold text-slate-900 mb-2">CONCORE AI</h1>
              <p className="text-sm text-slate-500 mb-6">Speech-to-Data Platform</p>
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-800 text-sm">
                Wybierz link do raportu ze swojej wiadomości e-mail, aby przejść do Huba Raportowego.
              </div>
            </div>
          </div>
        } />
        <Route path="/raport/:meeting_id" element={<ReportPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
