import { useEffect, useMemo, useState } from 'react'
import type { Decision, Evaluation } from '../types'
import { fetchEvaluations } from '../lib/evaluations'

const LABELS: Record<Decision, string> = {
  in: 'Definitely In',
  maybe: 'Maybe',
  out: 'Out',
}

export function ResultsTab() {
  const [rows, setRows] = useState<Evaluation[]>([])
  const [shared, setShared] = useState(true)
  const [loading, setLoading] = useState(true)
  const [decisionFilter, setDecisionFilter] = useState<'all' | Decision | 'remarks'>('all')
  const [query, setQuery] = useState('')

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (decisionFilter === 'remarks' && r.decision !== null) return false
      if (decisionFilter !== 'all' && decisionFilter !== 'remarks' && r.decision !== decisionFilter) return false
      if (!q) return true
      return (
        r.candidate_name.toLowerCase().includes(q) ||
        r.interviewer_name.toLowerCase().includes(q) ||
        r.remarks.toLowerCase().includes(q) ||
        r.characteristics.toLowerCase().includes(q)
      )
    })
  }, [rows, decisionFilter, query])

  const counts = useMemo(() => {
    return {
      in: rows.filter((r) => r.decision === 'in').length,
      maybe: rows.filter((r) => r.decision === 'maybe').length,
      out: rows.filter((r) => r.decision === 'out').length,
    }
  }, [rows])

  return (
    <div>
      {!shared && (
        <p className="status-msg error" style={{ marginBottom: 14 }}>
          Showing local results only on this device. Run `supabase/schema.sql` in Supabase so everyone sees every remark.
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
          <option value="all">All entries</option>
          <option value="in">Definitely In</option>
          <option value="maybe">Maybe</option>
          <option value="out">Out</option>
          <option value="remarks">Remarks only</option>
        </select>
        <button type="button" className="btn btn-ghost" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="empty">Loading results…</p>
      ) : filtered.length === 0 ? (
        <p className="empty">No evaluations yet. Evaluate candidates in the Panel tab.</p>
      ) : (
        <div className="card results-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Interviewer</th>
                <th>Panel</th>
                <th>Decision</th>
                <th>Remarks</th>
                <th>Characteristics</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id || `${r.candidate_id}-${r.interviewer_name}-${r.remarks.slice(0, 20)}`}>
                  <td>
                    <strong>{r.candidate_name}</strong>
                    <div className="meta-line">#{r.candidate_id}</div>
                  </td>
                  <td>{r.interviewer_name}</td>
                  <td>{r.panel === 'free' ? 'Free' : `Panel ${r.panel}`}</td>
                  <td>
                    {r.decision ? (
                      <span className={`badge ${r.decision}`}>{LABELS[r.decision]}</span>
                    ) : (
                      <span className="meta-line">Remarks only</span>
                    )}
                  </td>
                  <td>{r.remarks || '—'}</td>
                  <td>{r.characteristics || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
