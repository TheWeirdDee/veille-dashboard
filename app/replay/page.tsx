import { BACKTESTS, getBacktest } from '@/lib/backtest'
import type { BacktestFire, KeyEvent } from '@/lib/backtest'
import { OutcomeBadge } from '../components/OutcomeBadge'

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

function minuteLabel(minute: number): string {
  return minute > 90 ? `${minute}' (ET)` : `${minute}'`
}

function eventLabel(type: string): string {
  return type.replace(/_/g, ' ')
}

type TimelineItem = { kind: 'event'; timestamp: number; event: KeyEvent } | { kind: 'fire'; timestamp: number; fire: BacktestFire }

export default async function ReplayPage({
  searchParams,
}: {
  searchParams: Promise<{ match?: string }>
}) {
  const { match } = await searchParams
  const result = getBacktest(match)

  const timeline: TimelineItem[] = [
    ...result.keyEvents.map((event): TimelineItem => ({ kind: 'event', timestamp: event.timestamp, event })),
    ...result.fires.map((fire): TimelineItem => ({ kind: 'fire', timestamp: fire.firedAt, fire })),
  ].sort((a, b) => a.timestamp - b.timestamp)

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Historical replay
        </h1>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          These matches already happened. The events below are TxLINE&apos;s real record of them, run through the
          exact same signal detector SCOUT uses live. This is how VEILLE demonstrates its logic regardless of
          whether a World Cup match happens to be live right now.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {Object.values(BACKTESTS).map((b) => {
          const active = b.matchId === result.matchId
          return (
            <a
              key={b.matchId}
              href={`/replay?match=${b.matchId}`}
              className="rounded-full px-3 py-1.5 text-sm"
              style={{
                background: active ? 'var(--series-blue)' : 'var(--surface-1)',
                color: active ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {b.homeTeam} vs {b.awayTeam}
            </a>
          )
        })}
      </div>

      <section
        className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg p-5"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        <div>
          <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {result.homeTeam} {result.homeScore}–{result.awayScore} {result.awayTeam}
          </div>
          <div className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            Final phase: {result.phase} · {result.fires.length} signal fire{result.fires.length === 1 ? '' : 's'} ·{' '}
            {result.keyEvents.length} key events
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ background: 'var(--status-muted-bg)', color: 'var(--text-secondary)' }}
        >
          Historical — not a live production fire
        </span>
      </section>

      {result.fires.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Signal fires
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {result.fires.map((fire, i) => {
              const preFav = fire.favouredTeam === 'home' ? fire.preEventHomeProb : fire.preEventAwayProb
              const postFav = fire.favouredTeam === 'home' ? fire.postSignalHomeProb : fire.postSignalAwayProb
              return (
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
                    <OutcomeBadge value={fire.outcome} />
                  </div>
                  <div className="mt-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                    {eventLabel(fire.triggerEvent)} at {minuteLabel(fire.triggerMinute)} → {fire.position.replace('_', ' ')}
                  </div>
                  <div className="tabular mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {pct(preFav)} → {pct(postFav)} in {fire.windowSeconds.toFixed(0)}s (+{pct(fire.delta)})
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Match timeline
        </h2>
        <div className="overflow-hidden rounded-lg" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          {timeline.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-2.5 text-sm"
              style={i < timeline.length - 1 ? { borderBottom: '1px solid var(--gridline)' } : undefined}
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
                    ({item.fire.outcome})
                  </span>
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
