import { FormEvent, useState } from 'react'
import type { InterviewerSession, PanelId } from '../types'

const PANELS: { id: PanelId; label: string }[] = [
  { id: '1', label: 'Panel 1' },
  { id: '2', label: 'Panel 2' },
  { id: 'free', label: 'Free Panel' },
]

type Props = {
  onLogin: (session: InterviewerSession) => void
}

export function Login({ onLogin }: Props) {
  const [name, setName] = useState('')
  const [panel, setPanel] = useState<PanelId | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !panel) return
    onLogin({ name: name.trim(), panel })
  }

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={handleSubmit}>
        <p className="brand">Sportscom</p>
        <p className="sub">Sports Committee interviews — sign in to evaluate your panel.</p>

        <div className="field">
          <label htmlFor="name">Your name</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter interviewer name"
            autoFocus
            required
          />
        </div>

        <div className="field">
          <label>Select panel</label>
          <div className="panel-grid">
            {PANELS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`panel-option ${panel === p.id ? 'active' : ''}`}
                onClick={() => setPanel(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={!name.trim() || !panel}>
          Enter dashboard
        </button>
      </form>
    </div>
  )
}
