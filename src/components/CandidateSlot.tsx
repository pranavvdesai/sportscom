import { useEffect, useMemo, useRef, useState } from 'react'
import type { Candidate } from '../types'

type Props = {
  label: string
  candidates: Candidate[]
  selected: Candidate | null
  excludedIds: number[]
  onSelect: (c: Candidate | null) => void
}

export function CandidateSlot({ label, candidates, selected, excludedIds, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return candidates
      .filter((c) => !excludedIds.includes(c.id) || selected?.id === c.id)
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          String(c.id).includes(q),
      )
      .slice(0, 8)
  }, [candidates, excludedIds, query, selected])

  const showDropdown = open && results.length > 0

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  if (selected) {
    return (
      <div className="card slot">
        <div className="slot-label">{label}</div>
        <p className="selected-name">{selected.name}</p>
        <p className="meta-line">{selected.email || 'No email'}</p>
        <div className="slot-actions">
          <button type="button" className="clear-btn" onClick={() => onSelect(null)}>
            Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`card slot ${showDropdown ? 'is-open' : ''}`}>
      <div className="slot-label">{label}</div>
      <div className="search-wrap" ref={wrapRef}>
        <input
          className="search-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search name / email / ID"
          autoComplete="off"
        />
        {showDropdown && (
          <div className="search-results" role="listbox">
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                className="search-item"
                role="option"
                onClick={() => {
                  onSelect(c)
                  setQuery('')
                  setOpen(false)
                }}
              >
                {c.name}
                <small>
                  #{c.id} · {c.vertical || 'No vertical'}
                </small>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
