'use client'

/**
 * Animated match replay: the full-match 1X2 win probabilities replay
 * themselves on a timeline with goal/red-card markers, and the signal fire
 * pops exactly where the detector fired. Powered by the downsampled
 * probSeries the precompute script bundles — no live TxLINE access needed.
 *
 * Chart rules (dataviz skill): one axis, 2px lines, recessive grid, legend +
 * direct labels for the two series, crosshair tooltip listing every series,
 * text in text tokens, home/away pair CVD-validated on both surfaces.
 */

import { useEffect, useMemo, useRef, useState } from 'react'

export interface ProbPoint {
  t: number
  h: number
  a: number
}

export interface PlayerEvent {
  type: string
  team: 'home' | 'away' | null
  minute: number
  timestamp: number
}

export interface PlayerFire {
  strategy: 'A' | 'B'
  triggerMinute: number
  firedAt: number
  delta: number
  favouredTeam: 'home' | 'away'
  position: string
  outcome: 'hit' | 'miss'
}

const PLAYBACK_MS = 45_000 // whole match replays in ~45s

const CHART_W = 860
const CHART_H = 260
const PAD = { top: 18, right: 24, bottom: 26, left: 40 }

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

export function ReplayPlayer({
  probSeries,
  keyEvents,
  fires,
  homeTeam,
  awayTeam,
}: {
  probSeries: ProbPoint[]
  keyEvents: PlayerEvent[]
  fires: PlayerFire[]
  homeTeam: string
  awayTeam: string
}) {
  const t0 = probSeries[0]?.t ?? 0
  const t1 = probSeries[probSeries.length - 1]?.t ?? 1
  const span = Math.max(1, t1 - t0)

  const [clock, setClock] = useState(t1) // virtual time; starts fully drawn
  const [playing, setPlaying] = useState(false)
  const [hoverX, setHoverX] = useState<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastFrame = useRef(0)
  const svgRef = useRef<SVGSVGElement>(null)

  const x = (t: number) => PAD.left + ((t - t0) / span) * (CHART_W - PAD.left - PAD.right)
  const y = (p: number) => PAD.top + (1 - p) * (CHART_H - PAD.top - PAD.bottom)

  const triggers = useMemo(
    () => keyEvents.filter((e) => (e.type === 'goal' || e.type === 'red_card') && e.timestamp >= t0 && e.timestamp <= t1),
    [keyEvents, t0, t1]
  )
  // A/B fire at the same instant — one marker per moment.
  const fireMoments = useMemo(() => {
    const seen = new Map<number, PlayerFire>()
    for (const f of fires) if (!seen.has(f.firedAt)) seen.set(f.firedAt, f)
    return [...seen.values()].filter((f) => f.firedAt >= t0 && f.firedAt <= t1)
  }, [fires, t0, t1])

  // Minute mapping for the x-axis: anchor on trigger events (minute↔timestamp
  // pairs); fall back to elapsed time from the series start.
  const minuteAt = useMemo(() => {
    const anchors = triggers.map((e) => ({ t: e.timestamp, m: e.minute }))
    return (t: number): number => {
      if (anchors.length === 0) return Math.max(0, Math.round((t - t0) / 60_000))
      const a = anchors.reduce((best, c) => (Math.abs(c.t - t) < Math.abs(best.t - t) ? c : best))
      return Math.max(0, Math.round(a.m + (t - a.t) / 60_000))
    }
  }, [triggers, t0])

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      return
    }
    const step = (now: number) => {
      const dt = lastFrame.current ? now - lastFrame.current : 0
      lastFrame.current = now
      setClock((c) => {
        const next = c + (dt / PLAYBACK_MS) * span
        if (next >= t1) {
          setPlaying(false)
          return t1
        }
        return next
      })
      rafRef.current = requestAnimationFrame(step)
    }
    lastFrame.current = 0
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, span, t1])

  const play = () => {
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setClock(t1)
      return
    }
    if (clock >= t1) setClock(t0)
    setPlaying(true)
  }

  const visible = useMemo(() => probSeries.filter((p) => p.t <= clock), [probSeries, clock])
  const path = (get: (p: ProbPoint) => number) =>
    visible.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(get(p)).toFixed(1)}`).join('')

  const head = visible[visible.length - 1]

  // Crosshair: nearest visible point to the pointer.
  const hover = useMemo(() => {
    if (hoverX === null || visible.length === 0) return null
    let best = visible[0]
    for (const p of visible) if (Math.abs(x(p.t) - hoverX) < Math.abs(x(best.t) - hoverX)) best = p
    const nearEvents = triggers.filter((e) => Math.abs(e.timestamp - best.t) < 90_000)
    return { p: best, events: nearEvents }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverX, visible, triggers])

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    setHoverX(((e.clientX - rect.left) / rect.width) * CHART_W)
  }

  if (probSeries.length < 2) return null

  const minuteTicks = [0, 15, 30, 45, 60, 75, 90]
  const tickTimes = minuteTicks
    .map((m) => {
      const anchor = triggers[0]
      const base = anchor ? anchor.timestamp - anchor.minute * 60_000 : t0
      return { m, t: base + m * 60_000 }
    })
    .filter(({ t }) => t >= t0 && t <= t1)

  return (
    <section className="mb-8 rounded-lg p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={playing ? () => setPlaying(false) : play}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
            style={{ background: 'var(--series-blue)', color: '#fff' }}
          >
            {playing ? '❚❚ Pause' : clock >= t1 ? '▶ Replay match' : '▶ Play'}
          </button>
          <span className="tabular text-sm" style={{ color: 'var(--text-secondary)' }}>
            {minuteAt(clock)}′
          </span>
        </div>
        <div className="flex gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="flex items-center gap-1.5">
            <span style={{ display: 'inline-block', width: 14, height: 2, background: 'var(--series-home)' }} />
            {homeTeam}
            {head && <strong className="tabular" style={{ color: 'var(--text-primary)' }}>{fmtPct(head.h)}</strong>}
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ display: 'inline-block', width: 14, height: 2, background: 'var(--series-away)' }} />
            {awayTeam}
            {head && <strong className="tabular" style={{ color: 'var(--text-primary)' }}>{fmtPct(head.a)}</strong>}
          </span>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full"
        role="img"
        aria-label={`Win probability over time: ${homeTeam} vs ${awayTeam}`}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHoverX(null)}
      >
        {/* recessive grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <g key={p}>
            <line x1={PAD.left} x2={CHART_W - PAD.right} y1={y(p)} y2={y(p)} stroke="var(--gridline)" strokeWidth="1" />
            <text x={PAD.left - 6} y={y(p) + 3} textAnchor="end" fontSize="10" fill="var(--text-muted)">
              {p * 100}%
            </text>
          </g>
        ))}
        {tickTimes.map(({ m, t }) => (
          <text key={m} x={x(t)} y={CHART_H - 8} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
            {m}′
          </text>
        ))}

        {/* goal / red-card markers */}
        {triggers.map((e, i) => {
          const played = e.timestamp <= clock
          const color = e.team === 'home' ? 'var(--series-home)' : 'var(--series-away)'
          return (
            <g key={i} opacity={played ? 1 : 0.25}>
              <line x1={x(e.timestamp)} x2={x(e.timestamp)} y1={PAD.top} y2={CHART_H - PAD.bottom} stroke={color} strokeWidth="1" strokeDasharray="2 3" />
              <circle cx={x(e.timestamp)} cy={PAD.top} r="7" fill="var(--surface-1)" stroke={color} strokeWidth="2" />
              <text x={x(e.timestamp)} y={PAD.top + 3} textAnchor="middle" fontSize="8" fontWeight="700" fill={color}>
                {e.type === 'goal' ? 'G' : 'R'}
              </text>
            </g>
          )
        })}

        {/* signal fire markers */}
        {fireMoments.map((f, i) => {
          const fired = f.firedAt <= clock
          return (
            <g key={i} opacity={fired ? 1 : 0.2}>
              <line x1={x(f.firedAt)} x2={x(f.firedAt)} y1={PAD.top} y2={CHART_H - PAD.bottom} stroke="var(--series-blue)" strokeWidth={fired ? 2 : 1} />
              <circle cx={x(f.firedAt)} cy={y(0.5)} r={fired ? 9 : 6} fill="none" stroke="var(--series-blue)" strokeWidth="2">
                {fired && playing && <animate attributeName="r" values="6;11;6" dur="1.2s" repeatCount="indefinite" />}
              </circle>
              <text x={x(f.firedAt) + 12} y={y(0.5) + 3} fontSize="10" fontWeight="600" fill="var(--text-primary)">
                SIGNAL {f.triggerMinute}′
              </text>
            </g>
          )
        })}

        {/* series */}
        <path d={path((p) => p.h)} fill="none" stroke="var(--series-home)" strokeWidth="2" strokeLinejoin="round" />
        <path d={path((p) => p.a)} fill="none" stroke="var(--series-away)" strokeWidth="2" strokeLinejoin="round" />
        {head && (
          <>
            <circle cx={x(head.t)} cy={y(head.h)} r="4" fill="var(--series-home)" stroke="var(--surface-1)" strokeWidth="2" />
            <circle cx={x(head.t)} cy={y(head.a)} r="4" fill="var(--series-away)" stroke="var(--surface-1)" strokeWidth="2" />
          </>
        )}

        {/* crosshair + tooltip */}
        {hover && (
          <g pointerEvents="none">
            <line x1={x(hover.p.t)} x2={x(hover.p.t)} y1={PAD.top} y2={CHART_H - PAD.bottom} stroke="var(--text-muted)" strokeWidth="1" />
            <circle cx={x(hover.p.t)} cy={y(hover.p.h)} r="4" fill="var(--series-home)" stroke="var(--surface-1)" strokeWidth="2" />
            <circle cx={x(hover.p.t)} cy={y(hover.p.a)} r="4" fill="var(--series-away)" stroke="var(--surface-1)" strokeWidth="2" />
            {(() => {
              const tx = Math.min(x(hover.p.t) + 10, CHART_W - 190)
              const rows = 2 + hover.events.length
              return (
                <g transform={`translate(${tx},${PAD.top + 6})`}>
                  <rect width="180" height={20 + rows * 16} rx="6" fill="var(--surface-1)" stroke="var(--border)" />
                  <text x="10" y="16" fontSize="10" fill="var(--text-muted)">
                    {minuteAt(hover.p.t)}′
                  </text>
                  <g transform="translate(10,32)">
                    <line x1="0" x2="12" y1="-3" y2="-3" stroke="var(--series-home)" strokeWidth="2" />
                    <text x="18" y="0" fontSize="11" fill="var(--text-secondary)">
                      {homeTeam} <tspan fontWeight="700" fill="var(--text-primary)">{fmtPct(hover.p.h)}</tspan>
                    </text>
                  </g>
                  <g transform="translate(10,48)">
                    <line x1="0" x2="12" y1="-3" y2="-3" stroke="var(--series-away)" strokeWidth="2" />
                    <text x="18" y="0" fontSize="11" fill="var(--text-secondary)">
                      {awayTeam} <tspan fontWeight="700" fill="var(--text-primary)">{fmtPct(hover.p.a)}</tspan>
                    </text>
                  </g>
                  {hover.events.map((e, i) => (
                    <text key={i} x="10" y={64 + i * 16} fontSize="10" fill="var(--text-muted)">
                      {e.type === 'goal' ? 'Goal' : 'Red card'} — {e.team === 'home' ? homeTeam : awayTeam} {e.minute}′
                    </text>
                  ))}
                </g>
              )
            })()}
          </g>
        )}
      </svg>

      {/* scrubber */}
      <input
        type="range"
        min={t0}
        max={t1}
        step={1000}
        value={clock}
        aria-label="Match timeline position"
        onChange={(e) => {
          setPlaying(false)
          setClock(Number(e.target.value))
        }}
        className="mt-1 w-full"
        style={{ accentColor: 'var(--series-blue)' }}
      />
    </section>
  )
}
