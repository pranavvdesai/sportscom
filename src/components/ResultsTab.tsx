import { useEffect, useMemo, useState } from 'react'
import type { Decision, Evaluation } from '../types'
import { deleteCandidateEvaluations, fetchEvaluations } from '../lib/evaluations'
import { canDeleteResults } from '../lib/panelAccess'

const LABELS: Record<Decision, string> = {
  in: 'Definitely In',
  maybe: 'Maybe',
  out: 'Out',
}

type CandidateGroup = {
  candidateId: number
  candidateName: string
  finalDecision: Decision | null
  panels: string[]
  entries: Evaluation[]
}

type Props = {
  interviewerName: string
}

export function ResultsTab({ interviewerName }: Props) {
  const [rows, setRows] = useState<Evaluation[]>([])
  const [shared, setShared] = useState(true)
  const [loading, setLoading] = useState(true)
  const [decisionFilter, setDecisionFilter] = useState<'all' | Decision | 'remarks'>('all')
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<CandidateGroup | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const isAdmin = canDeleteResults(interviewerName)

  async function load() {
    setLoading(true)
    const data = await fetchEvaluations()
    setRows(data.rows)
    setShared(data.shared)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const groups = useMemo(() => {
    const map = new Map<number, CandidateGroup>()
    for (const r of rows) {
      const existing = map.get(r.candidate_id)
      if (!existing) {
        map.set(r.candidate_id, {
          candidateId: r.candidate_id,
          candidateName: r.candidate_name,
          finalDecision: r.decision,
          panels: [r.panel],
          entries: [r],
        })
      } else {
        existing.entries.push(r)
        if (!existing.finalDecision && r.decision) existing.finalDecision = r.decision
        // Prefer a real decision over null; if multiple, keep first decision found (lead usually)
        if (r.decision && (!existing.finalDecision || existing.finalDecision !== r.decision)) {
          // Keep the most recent decision-bearing row (rows already newest-first)
          if (!existing.entries.find((e) => e !== r && e.decision)) {
            existing.finalDecision = r.decision
          } else if (r.decision) {
            const firstWithDecision = existing.entries.find((e) => e.decision)
            existing.finalDecision = firstWithDecision?.decision ?? r.decision
          }
        }
        if (!existing.panels.includes(r.panel)) existing.panels.push(r.panel)
        if (r.candidate_name) existing.candidateName = r.candidate_name
      }
    }

    // Normalize final decision: first non-null decision in newest-first order
    for (const g of map.values()) {
      const withDecision = g.entries.find((e) => e.decision)
      g.finalDecision = withDecision?.decision ?? null
      g.entries.sort((a, b) => {
        const ta = a.created_at ? Date.parse(a.created_at) : 0
        const tb = b.created_at ? Date.parse(b.created_at) : 0
        return tb - ta
      })
    }

    let list = Array.from(map.values())
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (g) =>
          g.candidateName.toLowerCase().includes(q) ||
          String(g.candidateId).includes(q) ||
          g.entries.some(
            (e) =>
              e.interviewer_name.toLowerCase().includes(q) ||
              e.remarks.toLowerCase().includes(q) ||
              e.characteristics.toLowerCase().includes(q),
          ),
      )
    }
    if (decisionFilter === 'remarks') {
      list = list.filter((g) => g.finalDecision === null)
    } else if (decisionFilter !== 'all') {
      list = list.filter((g) => g.finalDecision === decisionFilter)
    }

    list.sort((a, b) => a.candidateName.localeCompare(b.candidateName))
    return list
  }, [rows, query, decisionFilter])

  const counts = useMemo(() => {
    const allGroups = new Map<number, Decision | null>()
    for (const r of rows) {
      const prev = allGroups.get(r.candidate_id)
      if (prev === undefined) allGroups.set(r.candidate_id, r.decision)
      else if (!prev && r.decision) allGroups.set(r.candidate_id, r.decision)
    }
    const decisions = Array.from(allGroups.values())
    return {
      in: decisions.filter((d) => d === 'in').length,
      maybe: decisions.filter((d) => d === 'maybe').length,
      out: decisions.filter((d) => d === 'out').length,
    }
  }, [rows])

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError(null)
    const res = await deleteCandidateEvaluations(pendingDelete.candidateId)
    setDeleting(false)
    if (!res.ok) {
      setDeleteError(res.error || 'Could not delete.')
      return
    }
    setPendingDelete(null)
    await load()
  }

  return (
    <div>
      {!shared && (
        <p className="status-msg error" style={{ marginBottom: 14 }}>
          Showing local results only on this device.
        </p>
      )}

      <div className="summary-row">
        <div className="card summary-card">
          <p className="n" style={{ color: 'var(--in)' }}>
            {counts.in}
          </p>
          <p className="l">Definitely In</p>
        </div>
        <div className="card summary-card">
          <p className="n" style={{ color: 'var(--maybe)' }}>
            {counts.maybe}
          </p>
          <p className="l">Maybe</p>
        </div>
        <div className="card summary-card">
          <p className="n" style={{ color: 'var(--out)' }}>
            {counts.out}
          </p>
          <p className="l">Out</p>
        </div>
      </div>

      <div className="results-filters">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search candidate / interviewer / remarks"
          style={{ flex: 1, minWidth: 200 }}
        />
        <select
          value={decisionFilter}
          onChange={(e) => setDecisionFilter(e.target.value as 'all' | Decision | 'remarks')}
        >
          <option value="all">All candidates</option>
          <option value="in">Definitely In</option>
          <option value="maybe">Maybe</option>
          <option value="out">Out</option>
          <option value="remarks">No final decision yet</option>
        </select>
        <button type="button" className="btn btn-ghost" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="empty">Loading results…</p>
      ) : groups.length === 0 ? (
        <p className="empty">No evaluations yet. Evaluate candidates in the Panel tab.</p>
      ) : (
        <div className="results-groups">
          {groups.map((g) => (
            <article key={g.candidateId} className="card result-person">
              <header className="result-person-head">
                <div>
                  <h3>{g.candidateName}</h3>
                  <p className="meta-line">
                    #{g.candidateId}
                    {g.panels.length
                      ? ` · ${g.panels.map((p) => (p === 'free' ? 'Free' : `Panel ${p}`)).join(', ')}`
                      : ''}
                    {` · ${g.entries.length} remark${g.entries.length === 1 ? '' : 's'}`}
                  </p>
                </div>
                <div className="result-person-actions">
                  {g.finalDecision ? (
                    <span className={`badge ${g.finalDecision}`}>{LABELS[g.finalDecision]}</span>
                  ) : (
                    <span className="meta-line">No final decision</span>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn btn-remove"
                      onClick={() => {
                        setDeleteError(null)
                        setPendingDelete(g)
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </header>

              <div className="remark-list">
                {g.entries.map((e) => (
                  <div
                    key={e.id || `${e.interviewer_name}-${e.remarks}-${e.created_at}`}
                    className="remark-item"
                  >
                    <div className="remark-item-top">
                      <strong>{e.interviewer_name}</strong>
                      <span className="meta-line">
                        {e.panel === 'free' ? 'Free panel' : `Panel ${e.panel}`}
                        {e.decision ? ` · ${LABELS[e.decision]}` : ' · Remarks only'}
                      </span>
                    </div>
                    <p className="remark-text">{e.remarks || '—'}</p>
                    {e.characteristics ? (
                      <p className="meta-line">Characteristics: {e.characteristics}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {pendingDelete && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="card modal-card">
            <h3>Delete {pendingDelete.candidateName}?</h3>
            <p className="meta-line" style={{ marginTop: 8, lineHeight: 1.5 }}>
              This removes every remark and decision for this candidate from Results & Remarks. This cannot be
              undone.
            </p>
            {deleteError && <p className="status-msg error">{deleteError}</p>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button type="button" className="btn btn-remove" disabled={deleting} onClick={() => void confirmDelete()}>
                {deleting ? 'Deleting…' : 'OK, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
