'use client'

/**
 * Animated match replay: the full-match 1X2 win probabilities replay
 * themselves on a timeline with goal/red-card markers, and the signal fire
 * pops exactly where the detector fired. Powered by the downsampled
 * probSeries the precompute script bundles — no live TxLINE access needed.
 *
 * The fire cards and match timeline below the chart share the same virtual
 * clock: rows reveal as the playhead passes them, and outcomes stay hidden
 * until the replay reaches full time — the replay doesn't spoil the match.
 *
 * Chart rules (dataviz skill): one axis, 2px lines, recessive grid, legend +
 * direct labels for the two series, crosshair tooltip listing every series,
 * text in text tokens, home/away pair CVD-validated on both surfaces.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { OutcomeBadge } from './OutcomeBadge'

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
  triggerEvent: string
  triggerMinute: number
  firedAt: number
  delta: number
  favouredTeam: 'home' | 'away'
  position: string
  outcome: string
  preFavProb: number
  postFavProb: number
  windowSeconds: number
}

const SPEEDS = [
  { label: '1×', ms: 90_000 },
  { label: '2×', ms: 45_000 },
] as const

const CHART_W = 860
const CHART_H = 260
const PAD = { top: 18, right: 24, bottom: 26, left: 40 }

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

function minuteLabel(minute: number): string {
  return minute > 90 ? `${minute}' (ET)` : `${minute}'`
}

function eventLabel(type: string): string {
  return type.replace(/_/g, ' ')
}

type TimelineItem =
  | { kind: 'event'; timestamp: number; event: PlayerEvent }
  | { kind: 'fire'; timestamp: number; fire: PlayerFire }

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
  const hasChart = probSeries.length >= 2
  const t0 = hasChart ? probSeries[0].t : 0
  const t1 = hasChart ? probSeries[probSeries.length - 1].t : 1
  const span = Math.max(1, t1 - t0)

  const [clock, setClock] = useState(t1) // virtual time; starts fully drawn
  const [playing, setPlaying] = useState(false)
  const [speedIdx, setSpeedIdx] = useState(0)
  const [hoverX, setHoverX] = useState<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastFrame = useRef(0)
  const svgRef = useRef<SVGSVGElement>(null)

  const x = (t: number) => PAD.left + ((t - t0) / span) * (CHART_W - PAD.left - PAD.right)
  const y = (p: number) => PAD.top + (1 - p) * (CHART_H - PAD.top - PAD.bottom)

  // Full time reached (or no chart to animate): outcomes may be shown.
  const finished = !hasChart || clock >= t1
  const revealed = (t: number): boolean => !hasChart || t <= clock

  const timeline = useMemo<TimelineItem[]>(
    () =>
      [
        ...keyEvents.map((event): TimelineItem => ({ kind: 'event', timestamp: event.timestamp, event })),
        ...fires.map((fire): TimelineItem => ({ kind: 'fire', timestamp: fire.firedAt, fire })),
      ].sort((a, b) => a.timestamp - b.timestamp),
    [keyEvents, fires]
  )

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

  const playbackMs = SPEEDS[speedIdx].ms

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
        const next = c + (dt / playbackMs) * span
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
  }, [playing, span, t1, playbackMs])

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

  const minuteTicks = [0, 15, 30, 45, 60, 75, 90]
  const tickTimes = minuteTicks
    .map((m) => {
      const anchor = triggers[0]
      const base = anchor ? anchor.timestamp - anchor.minute * 60_000 : t0
      return { m, t: base + m * 60_000 }
    })
    .filter(({ t }) => t >= t0 && t <= t1)

  const visibleFires = fires.filter((f) => revealed(f.firedAt))
  const visibleTimeline = timeline.filter((item) => revealed(item.timestamp))

  return (
    <>
      {hasChart && (
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
              <div className="flex overflow-hidden rounded-full text-xs" style={{ border: '1px solid var(--border)' }}>
                {SPEEDS.map((s, i) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setSpeedIdx(i)}
                    className="px-2.5 py-1 font-medium"
                    style={{
                      background: i === speedIdx ? 'var(--status-muted-bg)' : 'transparent',
                      color: i === speedIdx ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                    aria-pressed={i === speedIdx}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
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
      )}

      {fires.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Signal fires
          </h2>
          {visibleFires.length === 0 ? (
            <div
              className="rounded-lg p-4 text-sm"
              style={{ background: 'var(--surface-1)', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}
            >
              Detector armed — no qualifying fire yet at {minuteAt(clock)}′.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleFires.map((fire, i) => (
                <div
                  key={i}
                  className="rounded-lg p-4"
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border)',
                    borderTop: `3px solid ${fire.strategy === 'A' ? 'var(--series-blue)' : 'var(--series-violet)'}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: fire.strategy === 'A' ? 'var(--series-blue)' : 'var(--series-violet)' }}
                    >
                      Strategy {fire.strategy}
                    </span>
                    <OutcomeBadge value={finished ? fire.outcome : 'open'} />
                  </div>
                  <div className="mt-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                    {eventLabel(fire.triggerEvent)} at {minuteLabel(fire.triggerMinute)} → {fire.position.replace('_', ' ')}
                  </div>
                  <div className="tabular mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {fmtPct(fire.preFavProb)} → {fmtPct(fire.postFavProb)} in {fire.windowSeconds.toFixed(0)}s (+
                    {fmtPct(fire.delta)})
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Match timeline
        </h2>
        <div className="overflow-hidden rounded-lg" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          {visibleTimeline.length === 0 && (
            <div className="px-4 py-2.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              Kick-off…
            </div>
          )}
          {visibleTimeline.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-2.5 text-sm"
              style={i < visibleTimeline.length - 1 ? { borderBottom: '1px solid var(--gridline)' } : undefined}
            >
              <span className="tabular w-14 shrink-0" style={{ color: 'var(--text-muted)' }}>
                {item.kind === 'event' ? minuteLabel(item.event.minute) : minuteLabel(item.fire.triggerMinute)}
              </span>
              {item.kind === 'event' ? (
                <span style={{ color: 'var(--text-secondary)' }}>
                  {eventLabel(item.event.type)}
                  {item.event.team && <span className="capitalize"> · {item.event.team}</span>}
                </span>
              ) : (
                <span
                  className="font-medium"
                  style={{ color: item.fire.strategy === 'A' ? 'var(--series-blue)' : 'var(--series-violet)' }}
                >
                  Signal fired — Strategy {item.fire.strategy} → {item.fire.position.replace('_', ' ')}
                  <span className="ml-2 font-normal" style={{ color: 'var(--text-muted)' }}>
                    ({finished ? item.fire.outcome : 'open'})
                  </span>
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
