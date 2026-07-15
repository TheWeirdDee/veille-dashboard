'use client'

/**
 * Searchable match selector for the replay page. The current match stays
 * visible as a pill; every other match lives behind a search dropdown so a
 * 100-match tournament doesn't become a wall of buttons.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export interface MatchOption {
  matchId: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  fires: number
  /** Rough match date (first key event) for display + ordering; 0 if unknown. */
  playedAt: number
}

function dateLabel(ts: number): string {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export function MatchPicker({ matches, currentId }: { matches: MatchOption[]; currentId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const current = matches.find((m) => m.matchId === currentId)
  const sorted = useMemo(() => [...matches].sort((a, b) => b.playedAt - a.playedAt), [matches])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((m) => `${m.homeTeam} ${m.awayTeam}`.toLowerCase().includes(q))
  }, [sorted, query])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const select = (matchId: string) => {
    setOpen(false)
    setQuery('')
    router.push(`/replay?match=${matchId}`)
  }

  return (
    <div ref={rootRef} className="relative mb-6 flex flex-wrap items-center gap-2">
      {current && (
        <span
          className="rounded-full px-3 py-1.5 text-sm font-medium"
          style={{ background: 'var(--series-blue)', color: '#fff', border: '1px solid var(--border)' }}
        >
          {current.homeTeam} {current.homeScore}–{current.awayScore} {current.awayTeam}
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm"
        style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
      >
        Browse all {matches.length} matches
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
          <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-20 mt-2 w-full max-w-md overflow-hidden rounded-lg shadow-lg"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
        >
          <div className="p-2" style={{ borderBottom: '1px solid var(--gridline)' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filtered.length > 0) select(filtered[0].matchId)
              }}
              placeholder="Search teams…"
              className="w-full rounded-md px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--surface-2, transparent)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>
          <ul className="max-h-80 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                No matches for “{query}”
              </li>
            )}
            {filtered.map((m) => {
              const active = m.matchId === currentId
              return (
                <li key={m.matchId}>
                  <button
                    type="button"
                    onClick={() => select(m.matchId)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm"
                    style={{ color: active ? 'var(--series-blue)' : 'var(--text-secondary)' }}
                  >
                    <span>
                      {m.homeTeam} <span className="tabular" style={{ color: 'var(--text-muted)' }}>{m.homeScore}–{m.awayScore}</span> {m.awayTeam}
                    </span>
                    <span className="tabular shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {dateLabel(m.playedAt)}
                      {m.fires > 0 && (
                        <span className="ml-2 rounded-full px-1.5 py-0.5" style={{ background: 'var(--status-muted-bg)', color: 'var(--text-secondary)' }}>
                          {m.fires} fire{m.fires === 1 ? '' : 's'}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
