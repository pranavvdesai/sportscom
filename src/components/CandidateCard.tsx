import { useState } from 'react'
import type { Candidate, Decision } from '../types'

export type EvalDraft = {
  decision: Decision | null
  remarks: string
  characteristics: string
}

type Props = {
  candidate: Candidate
  value: EvalDraft
  onChange: (next: EvalDraft) => void
  onRemove: () => void
  canDecide: boolean
  decisionLeadName: string
}

const DECISIONS: { id: Decision; label: string }[] = [
  { id: 'in', label: 'Definitely In' },
  { id: 'maybe', label: 'Maybe' },
  { id: 'out', label: 'Out' },
]

function Bullets({ items, empty = '—' }: { items: string[]; empty?: string }) {
  if (!items.length) return <p className="meta-line">{empty}</p>
  return (
    <ul className="insight-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export function CandidateCard({ candidate, value, onChange, onRemove, canDecide, decisionLeadName }: Props) {
  const [showFull, setShowFull] = useState(false)
  const insight = candidate.insight
  const topSports = candidate.topSports.filter((s) => s.level >= 3)

  return (
    <article className="card candidate-card">
      <div className="candidate-head">
        <div>
          <h3>{candidate.name}</h3>
          <p className="meta-line">
            #{candidate.id} · {candidate.vertical || 'Vertical not set'} · {candidate.email}
          </p>
          {insight?.summary ? <p className="insight-summary">{insight.summary}</p> : null}
        </div>
        <button type="button" className="btn btn-remove" onClick={onRemove}>
          Remove
        </button>
      </div>

      <div className="block">
        <h4>What they’re good at</h4>
        <Bullets items={insight?.goodAt || []} empty="Not enough detail to judge strengths yet." />
      </div>

      <div className="block">
        <h4>Competition level mentioned</h4>
        {(insight?.competitionLevels?.length || 0) === 0 ? (
          <p className="meta-line">No clear state / national / college level mentioned in their answers.</p>
        ) : (
          <div className="tags">
            {insight!.competitionLevels.map((level) => (
              <span key={level} className="tag level-badge">
                {level}
              </span>
            ))}
          </div>
        )}
        {(insight?.levelMentions?.length || 0) > 0 && (
          <ul className="insight-list" style={{ marginTop: 10 }}>
            {insight!.levelMentions.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="block">
        <h4>Top sports (proficiency 3–5)</h4>
        {topSports.length === 0 ? (
          <p className="meta-line">No sports rated 3, 4, or 5 on the form.</p>
        ) : (
          <div className="tags">
            {topSports.map((s) => (
              <span key={s.sport} className={`tag level-${s.level}`}>
                {s.sport} · {s.level}
              </span>
            ))}
          </div>
        )}
        {(insight?.sportsMentioned?.length || 0) > 0 && (
          <p className="meta-line" style={{ marginTop: 8 }}>
            Also mentioned in writing: {insight!.sportsMentioned.join(', ')}
          </p>
        )}
      </div>

      <div className="block">
        <h4>Achievements (summary)</h4>
        <Bullets
          items={insight?.achievementsBullets || []}
          empty={candidate.achievements ? candidate.achievements : 'No achievements shared.'}
        />
      </div>

      <div className="block">
        <h4>What Sports Committee means to them</h4>
        <Bullets items={insight?.sportsComBullets || []} empty="No answer shared." />
      </div>

      <div className="block">
        <h4>Favorite sports memory</h4>
        <Bullets items={insight?.memoryBullets || []} empty="No memory shared." />
      </div>

      {candidate.otherSports ? (
        <div className="block">
          <h4>Other sports noted</h4>
          <p>{candidate.otherSports}</p>
        </div>
      ) : null}

      <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => setShowFull((v) => !v)}>
        {showFull ? 'Hide full answers' : 'Show full written answers'}
      </button>

      {showFull && (
        <div className="full-answers">
          <div className="block">
            <h4>Full — achievements</h4>
            <p>{candidate.achievements || '—'}</p>
          </div>
          <div className="block">
            <h4>Full — SportsCom meaning</h4>
            <p>{candidate.cultureAnswer || '—'}</p>
          </div>
          <div className="block">
            <h4>Full — favorite memory</h4>
            <p>{candidate.favoriteMemory || '—'}</p>
          </div>
        </div>
      )}

      {canDecide ? (
        <div className="decision-row">
          {DECISIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`decision ${value.decision === d.id ? `active-${d.id}` : ''}`}
              onClick={() => onChange({ ...value, decision: d.id })}
            >
              {d.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="meta-line decision-locked">
          Final In / Maybe / Out is set by <strong>{decisionLeadName}</strong> for this panel. You can still add remarks.
        </p>
      )}

      <div className="field">
        <label>
          Remarks{' '}
          {canDecide && value.decision
            ? `(why ${value.decision === 'in' ? 'In' : value.decision === 'maybe' ? 'Maybe' : 'Out'})`
            : ''}
        </label>
        <textarea
          rows={3}
          value={value.remarks}
          onChange={(e) => onChange({ ...value, remarks: e.target.value })}
          placeholder="Add your remarks about this candidate..."
        />
      </div>

      <div className="field">
        <label>Other characteristics (optional)</label>
        <textarea
          rows={2}
          value={value.characteristics}
          onChange={(e) => onChange({ ...value, characteristics: e.target.value })}
          placeholder="Leadership, energy, communication, etc."
        />
      </div>
    </article>
  )
}
