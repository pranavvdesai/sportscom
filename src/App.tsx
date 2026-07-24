import { useEffect, useState } from 'react'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'
import type { InterviewerSession } from './types'

const SESSION_KEY = 'panel-eval-session'

export default function App() {
  const [session, setSession] = useState<InterviewerSession | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) setSession(JSON.parse(raw) as InterviewerSession)
    } catch {
      // ignore
    }
  }, [])

  function handleLogin(next: InterviewerSession) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(next))
    setSession(next)
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }

  if (!session) {
    return <Login onLogin={handleLogin} />
  }

  return <Dashboard session={session} onLogout={handleLogout} />
}
