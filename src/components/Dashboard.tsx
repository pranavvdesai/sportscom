import { useMemo, useState } from 'react'
import candidatesData from '../data/candidates.json'
import slotsData from '../data/slots.json'
import type { Candidate, Decision, InterviewerSession, InterviewSlot } from '../types'
import { CandidateCard, type EvalDraft } from './CandidateCard'
import { CandidateSlot } from './CandidateSlot'
import { ResultsTab } from './ResultsTab'
import { saveEvaluations } from '../lib/evaluations'
import { canSetDecision, decisionLeadLabel } from '../lib/panelAccess'

type Props = {
  session: InterviewerSession
  onLogout: () => void
}

const candidates = candidatesData as Candidate[]
const byId = new Map(candidates.map((c) => [c.id, c]))

const emptyDraft = (): EvalDraft => ({
  decision: null,
  section: '',
  remarks: '',
  characteristics: '',
})

export function Dashboard({ session, onLogout }: Props) {
  const [tab, setTab] = useState<'panel' | 'results'>('panel')
  const [slot1, setSlot1] = useState<Candidate | null>(null)
  const [slot2, setSlot2] = useState<Candidate | null>(null)
  const [slot3, setSlot3] = useState<Candidate | null>(null)
  const [drafts, setDrafts] = useState<Record<number, EvalDraft>>({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [readyForNext, setReadyForNext] = useState(false)
  const [activeSlotId, setActiveSlotId] = useState<string>('')
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null)

  const scheduleSlots = useMemo(() => {
    const all = slotsData as InterviewSlot[]
    if (session.panel === 'free') return all
    return all.filter((s) => s.panel === session.panel)
  }, [session.panel])

  const selected = useMemo(() => [slot1, slot2, slot3].filter(Boolean) as Candidate[], [slot1, slot2, slot3])
  const excluded = selected.map((c) => c.id)
  const panelLabel = session.panel === 'free' ? 'Free Panel' : `Panel ${session.panel}`
  const isDecisionLead = canSetDecision(session.name, session.panel)
  const leadName = decisionLeadLabel(session.panel)

  const activeSlotIndex = scheduleSlots.findIndex((s) => s.id === activeSlotId)
  const hasNextScheduleSlot = activeSlotIndex >= 0 && activeSlotIndex < scheduleSlots.length - 1

  function draftFor(id: number): EvalDraft {
    return drafts[id] ?? emptyDraft()
  }

  function setDraft(id: number, next: EvalDraft) {
    setDrafts((prev) => ({ ...prev, [id]: next }))
    setReadyForNext(false)
  }

  function applyTrio(trio: [Candidate | null, Candidate | null, Candidate | null], slotId: string) {
    setSlot1(trio[0])
    setSlot2(trio[1])
    setSlot3(trio[2])
    const nextDrafts: Record<number, EvalDraft> = {}
    for (const c of trio) {
      if (c) nextDrafts[c.id] = emptyDraft()
    }
    setDrafts(nextDrafts)
    setActiveSlotId(slotId)
    setSaveMsg(null)
    setSaveError(null)
    setReadyForNext(false)
    setScheduleMsg(null)
  }

  function loadScheduleSlot(slotId: string) {
    const found = scheduleSlots.find((s) => s.id === slotId) || (slotsData as InterviewSlot[]).find((s) => s.id === slotId)
    if (!found) return
    const trioSource = found.candidates.slice(0, 3)
    const extras = found.candidates.slice(3)
    const resolved: (Candidate | null)[] = trioSource.map((c) =>
      c.candidateId != null ? byId.get(c.candidateId) ?? null : null,
    )
    while (resolved.length < 3) resolved.push(null)
    const missing = trioSource.filter((_, i) => !resolved[i]).map((c) => c.name)
    applyTrio([resolved[0], resolved[1], resolved[2]], found.id)
    const bits: string[] = []
    bits.push(`Loaded ${found.label}: ${trioSource.map((c) => c.name).join(', ')}`)
    if (extras.length) bits.push(`Note: also slotted ${extras.map((c) => c.name).join(', ')} — add manually if needed`)
    if (missing.length) bits.push(`Could not match: ${missing.join(', ')}`)
    setScheduleMsg(bits.join(' · '))
  }

  function pickSlot(setter: (c: Candidate | null) => void, prev: Candidate | null) {
    return (c: Candidate | null) => {
      setReadyForNext(false)
      setScheduleMsg(null)
      if (prev && (!c || c.id !== prev.id)) {
        setDrafts((d) => {
          const copy = { ...d }
          delete copy[prev.id]
          return copy
        })
      }
      if (c && !drafts[c.id]) {
        setDrafts((d) => ({ ...d, [c.id]: emptyDraft() }))
      }
      setter(c)
    }
  }

  function startNextPanel() {
    if (hasNextScheduleSlot) {
      loadScheduleSlot(scheduleSlots[activeSlotIndex + 1].id)
      setTab('panel')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSlot1(null)
    setSlot2(null)
    setSlot3(null)
    setDrafts({})
    setActiveSlotId('')
    setSaveMsg(null)
    setSaveError(null)
    setScheduleMsg(null)
    setReadyForNext(false)
    setTab('panel')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSaveAll() {
    setSaveMsg(null)
    setSaveError(null)
    setReadyForNext(false)

    if (selected.length !== 3) {
      setSaveError('Add all 3 candidates before saving.')
      return
    }

    const missing: string[] = []
    for (const c of selected) {
      const d = draftFor(c.id)
      if (isDecisionLead && !d.decision) missing.push(`${c.name}: pick In / Maybe / Out`)
    }
    if (missing.length) {
      setSaveError(missing.join(' · '))
      return
    }

    setSaving(true)
    const res = await saveEvaluations(
      selected.map((c) => {
        const d = draftFor(c.id)
        return {
          interviewerName: session.name,
          panel: session.panel,
          candidate: c,
          decision: isDecisionLead ? (d.decision as Decision) : null,
          section: d.section,
          remarks: d.remarks,
          characteristics: d.characteristics,
        }
      }),
    )
    setSaving(false)

    if (res.ok) {
      setSaveMsg(
        res.shared
          ? 'Saved for the whole team — visible in Results & Remarks.'
          : 'Saved on this device only. Shared cloud table is not ready yet.',
      )
      setReadyForNext(true)
    } else {
      setSaveError(res.error || 'Could not save evaluations.')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1 className="brand">Sportscom</h1>
          <p className="sub">Group interview evaluation · Sports Committee</p>
        </div>
        <div className="topbar-meta">
          <span className="chip">
            Interviewer <strong>{session.name}</strong>
          </span>
          <span className="chip">
            Panel <strong>{panelLabel}</strong>
          </span>
          {isDecisionLead ? (
            <span className="chip">
              Role <strong>Decision lead</strong>
            </span>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button type="button" className={`tab ${tab === 'panel' ? 'active' : ''}`} onClick={() => setTab('panel')}>
          Panel
        </button>
        <button
          type="button"
          className={`tab ${tab === 'results' ? 'active' : ''}`}
          onClick={() => setTab('results')}
        >
          Results & Remarks
        </button>
      </nav>

      {tab === 'panel' ? (
        <>
          <div className="card schedule-bar">
            <div>
              <strong>Auto-load from today’s slots</strong>
              <p className="meta-line">
                {session.panel === 'free'
                  ? 'Free Panel — showing all Panel 1 & 2 slots (F3 / F4)'
                  : `Panel ${session.panel} slots only · Room ${session.panel === '1' ? 'F3 (+ late F4)' : 'F4'}`}
              </p>
            </div>
            <div className="schedule-controls">
              <select
                value={activeSlotId}
                onChange={(e) => {
                  const id = e.target.value
                  if (id) loadScheduleSlot(id)
                  else setActiveSlotId('')
                }}
              >
                <option value="">Select time slot…</option>
                {scheduleSlots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.slot} · {s.room} · {s.candidates.map((c) => c.name.split(' ')[0]).join(', ')}
                  </option>
                ))}
              </select>
              {activeSlotId && (
                <button type="button" className="btn btn-ghost" onClick={() => loadScheduleSlot(activeSlotId)}>
                  Reload slot
                </button>
              )}
            </div>
            {scheduleSlots.length === 0 && (
              <p className="meta-line">No slotted groups for this panel yet — use manual search.</p>
            )}
            {scheduleMsg && <p className="status-msg">{scheduleMsg}</p>}
          </div>

          <h2 className="section-title">Panel seats</h2>
          <p className="meta-line" style={{ margin: '-4px 0 12px' }}>
            Auto-load fills these. Tap <strong>Replace</strong> on any seat for a no-show or last-minute change.
          </p>
          <div className="slots">
            <CandidateSlot
              label="1st candidate"
              candidates={candidates}
              selected={slot1}
              excludedIds={excluded}
              onSelect={pickSlot(setSlot1, slot1)}
            />
            <CandidateSlot
              label="2nd candidate"
              candidates={candidates}
              selected={slot2}
              excludedIds={excluded}
              onSelect={pickSlot(setSlot2, slot2)}
            />
            <CandidateSlot
              label="3rd candidate"
              candidates={candidates}
              selected={slot3}
              excludedIds={excluded}
              onSelect={pickSlot(setSlot3, slot3)}
            />
          </div>

          {selected.length === 0 ? (
            <p className="empty">Pick a time slot above, or search and add candidates manually.</p>
          ) : (
            <>
              <div className="candidate-grid">
                {selected.map((c) => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    value={draftFor(c.id)}
                    onChange={(next) => setDraft(c.id, next)}
                    canDecide={isDecisionLead}
                    decisionLeadName={leadName}
                    onRemove={() => {
                      if (slot1?.id === c.id) pickSlot(setSlot1, slot1)(null)
                      else if (slot2?.id === c.id) pickSlot(setSlot2, slot2)(null)
                      else if (slot3?.id === c.id) pickSlot(setSlot3, slot3)(null)
                    }}
                  />
                ))}
              </div>

              <div className="save-all-bar card">
                <div>
                  <strong>Save panel evaluations</strong>
                  <p className="meta-line">
                    {isDecisionLead
                      ? 'Saves In / Maybe / Out for all 3. Remarks are optional.'
                      : `Remarks are optional. Final In / Maybe / Out is set by ${leadName}.`}
                  </p>
                </div>
                <div className="save-all-actions">
                  <button
                    type="button"
                    className="btn btn-save"
                    onClick={() => void handleSaveAll()}
                    disabled={saving || selected.length === 0}
                  >
                    {saving ? 'Saving all…' : 'Save all evaluations'}
                  </button>
                  {readyForNext && (
                    <button type="button" className="btn btn-next-panel" onClick={startNextPanel}>
                      {hasNextScheduleSlot ? 'Load next time slot' : 'Choose next panel'}
                    </button>
                  )}
                </div>
                {saveMsg && <p className="status-msg">{saveMsg}</p>}
                {saveError && <p className="status-msg error">{saveError}</p>}
              </div>
            </>
          )}
        </>
      ) : (
        <ResultsTab interviewerName={session.name} />
      )}
    </div>
  )
}
