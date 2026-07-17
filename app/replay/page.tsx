import { BACKTESTS, getBacktest } from '@/lib/backtest'
import { MatchPicker } from '../components/MatchPicker'
import type { MatchOption } from '../components/MatchPicker'
import { ReplayPlayer } from '../components/ReplayPlayer'

export default async function ReplayPage({
  searchParams,
}: {
  searchParams: Promise<{ match?: string }>
}) {
  const { match } = await searchParams
  const result = getBacktest(match)

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

      <MatchPicker
        currentId={result.matchId}
        matches={Object.values(BACKTESTS).map(
          (b): MatchOption => ({
            matchId: b.matchId,
            homeTeam: b.homeTeam,
            awayTeam: b.awayTeam,
            homeScore: b.homeScore,
            awayScore: b.awayScore,
            fires: b.fires.length,
            playedAt: b.keyEvents[0]?.timestamp ?? 0,
          })
        )}
      />

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

      <ReplayPlayer
        probSeries={result.probSeries ?? []}
        keyEvents={result.keyEvents}
        fires={result.fires.map((f) => ({
          strategy: f.strategy,
          triggerEvent: f.triggerEvent,
          triggerMinute: f.triggerMinute,
          firedAt: f.firedAt,
          delta: f.delta,
          favouredTeam: f.favouredTeam,
          position: f.position,
          outcome: f.outcome,
          preFavProb: f.favouredTeam === 'home' ? f.preEventHomeProb : f.preEventAwayProb,
          postFavProb: f.favouredTeam === 'home' ? f.postSignalHomeProb : f.postSignalAwayProb,
          windowSeconds: f.windowSeconds,
        }))}
        homeTeam={result.homeTeam}
        awayTeam={result.awayTeam}
      />
    </div>
  )
}
