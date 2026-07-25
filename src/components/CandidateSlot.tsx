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
  const [replacing, setReplacing] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
  const showSearch = !selected || replacing

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (selected) {
      setReplacing(false)
      setQuery('')
      setOpen(false)
    }
  }, [selected])

  useEffect(() => {
    if (showSearch && replacing) {
      inputRef.current?.focus()
      setOpen(true)
    }
  }, [showSearch, replacing])

  function startReplace() {
    setReplacing(true)
    setQuery('')
    onSelect(null)
  }

  if (selected && !replacing) {
    return (
      <div className="card slot">
        <div className="slot-label">{label}</div>
        <p className="selected-name">{selected.name}</p>
        <p className="meta-line">{selected.email || 'No email'}</p>
        <div className="slot-actions">
          <button type="button" className="btn-replace" onClick={startReplace}>
            Replace
          </button>
          <button type="button" className="clear-btn" onClick={() => onSelect(null)}>
            Remove
          </button>
        </div>
        <p className="meta-line slot-hint">Use Replace if they didn’t show up or the slot changed.</p>
      </div>
    )
  }

  return (
    <div className={`card slot ${showDropdown ? 'is-open' : ''}`}>
      <div className="slot-label">{label}</div>
      {replacing && <p className="meta-line slot-hint">Search a replacement for this seat</p>}
      <div className="search-wrap" ref={wrapRef}>
        <input
          ref={inputRef}
          className="search-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={replacing ? 'Search replacement name / email / ID' : 'Search name / email / ID'}
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
                  setReplacing(false)
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
      {replacing && (
        <button
          type="button"
          className="clear-btn"
          style={{ marginTop: 10 }}
          onClick={() => {
            setReplacing(false)
            setQuery('')
          }}
        >
          Cancel replace
        </button>
      )}
    </div>
  )
}
