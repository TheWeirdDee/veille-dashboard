import { getSignalDefinition } from '@/lib/dashboard-data'
import { getBacktest } from '@/lib/backtest'

export const dynamic = 'force-dynamic'

const TERMINAL_OUTPUT = `$ npx tsx scripts/independent-verify.ts 18222446
Argentina vs Switzerland
Recomputing from raw TxLINE records only: 1307 score records, 44891 odds records.

Independently found 5 real goal/red-card trigger(s):
  10' goal (home)
  67' goal (away)
  72' red_card (away)
  112' goal (home)
  121' goal (home)

Cross-checking each independently-detected fire against the published result:
  72' red_card -> home favoured: recomputed 32.1% -> 46.1% (Δ14.0pp)  |  published 32.1% -> 46.1%  [MATCH]

1 moment(s) where a trigger occurred but conditions were NOT met (selectivity check):
  10' goal -> home: pre-event prob 52.5% >= 40% cap — not an underdog

PUBLISHED AND INDEPENDENT FIRE SETS MATCH

$ npx tsx scripts/independent-verify.ts 18213979
Norway vs England
Recomputing from raw TxLINE records only: 1185 score records, 46107 odds records.

Independently found 5 real goal/red-card trigger(s):
  36' goal (home)
  47' goal (away)
  49' goal (away)
  55' goal (home)
  93' goal (away)

Cross-checking each independently-detected fire against the published result:
  36' goal -> home favoured: recomputed 19.6% -> 42.0% (Δ22.5pp)  |  published 19.6% -> 42.0%  [MATCH]
  47' goal -> away favoured: recomputed 25.9% -> 50.9% (Δ24.9pp)  |  published 25.9% -> 50.9%  [MATCH]
  55' goal -> home favoured: recomputed 20.3% -> 50.4% (Δ30.1pp)  |  published 20.3% -> 50.4%  [MATCH]

PUBLISHED AND INDEPENDENT FIRE SETS MATCH

$ npx tsx scripts/independent-verify.ts 18237038
France vs Spain
Recomputing from raw TxLINE records only: 1025 score records, 38494 odds records.

Independently found 3 real goal/red-card trigger(s):
  22' goal (away)
  58' goal (away)
  61' goal (away)

Cross-checking each independently-detected fire against the published result:
  22' goal -> away favoured: recomputed 29.6% -> 58.3% (Δ28.8pp)  |  published 29.6% -> 58.3%  [MATCH]

1 moment(s) where a trigger occurred but conditions were NOT met (selectivity check):
  58' goal -> away: pre-event prob 57.7% >= 40% cap — not an underdog

PUBLISHED AND INDEPENDENT FIRE SETS MATCH`

export default async function VerifyPage() {
  const [signal, example] = await Promise.all([getSignalDefinition(), Promise.resolve(getBacktest('18222446'))])
  const fire = example.fires[0]

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Verify independently
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          You don&apos;t have to trust this dashboard&apos;s numbers, or even VEILLE&apos;s own detector code. The
          signal is three public conditions applied to public data. Below is the exact arithmetic for one real fire,
          the live parameters as currently registered in the database, and a second, completely independent
          implementation — zero imports from VEILLE&apos;s production code — that recomputes every published fire
          from raw TxLINE records and checks it against the published result.
        </p>
      </header>

      {signal && (
        <section className="mb-6 rounded-lg p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Live from veille_signal_registry — not hardcoded on this page
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt style={{ color: 'var(--text-muted)' }}>Δ threshold</dt>
              <dd className="tabular" style={{ color: 'var(--text-primary)' }}>{(signal.deltaThreshold * 100).toFixed(0)}pp</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--text-muted)' }}>Window</dt>
              <dd className="tabular" style={{ color: 'var(--text-primary)' }}>{signal.windowSeconds}s</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--text-muted)' }}>Lookback</dt>
              <dd className="tabular" style={{ color: 'var(--text-primary)' }}>{signal.lookbackSeconds}s</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--text-muted)' }}>Pre-event cap</dt>
              <dd className="tabular" style={{ color: 'var(--text-primary)' }}>{(signal.preEventProbCap * 100).toFixed(0)}%</dd>
            </div>
            <div className="col-span-2 sm:col-span-2">
              <dt style={{ color: 'var(--text-muted)' }}>Registered</dt>
              <dd className="tabular" style={{ color: 'var(--status-good)' }}>{new Date(signal.registeredAt).toLocaleString()}</dd>
            </div>
          </dl>
        </section>
      )}

      {fire && (
        <section className="mb-6 rounded-lg p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <div className="mb-3 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Worked example — {example.homeTeam} vs {example.awayTeam}, {fire.triggerMinute}&apos; {fire.triggerEvent.replace('_', ' ')}
          </div>
          <ol className="flex flex-col gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>1.</strong> Pre-event probability for{' '}
              {fire.favouredTeam}: <span className="tabular">{((fire.favouredTeam === 'home' ? fire.preEventHomeProb : fire.preEventAwayProb) * 100).toFixed(1)}%</span>
              {' — '}
              {(fire.favouredTeam === 'home' ? fire.preEventHomeProb : fire.preEventAwayProb) < (signal?.preEventProbCap ?? 0.4)
                ? 'below the cap, condition 3 holds.'
                : 'check the cap.'}
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>2.</strong> A {fire.triggerEvent.replace('_', ' ')} is confirmed at {fire.triggerMinute}&apos; from TxLINE&apos;s scores feed — condition 2.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>3.</strong> Probability moves to{' '}
              <span className="tabular">{((fire.favouredTeam === 'home' ? fire.postSignalHomeProb : fire.postSignalAwayProb) * 100).toFixed(1)}%</span>{' '}
              within {fire.windowSeconds.toFixed(0)}s — a <span className="tabular">{(fire.delta * 100).toFixed(1)}pp</span> move, over the {(signal?.deltaThreshold ?? 0.12) * 100}pp threshold — condition 1.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>4.</strong> All three hold simultaneously → signal fires. Outcome: <strong style={{ color: 'var(--text-primary)' }}>{fire.outcome}</strong> ({example.homeTeam} {example.homeScore}–{example.awayScore} {example.awayTeam}).
            </li>
          </ol>
        </section>
      )}

      <section className="mb-6 rounded-lg p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          A second, independent implementation — actual captured output
        </div>
        <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <code className="tabular">scripts/independent-verify.ts</code> in the agent repo imports nothing from
          VEILLE&apos;s production detector. It re-derives trigger events and odds probabilities from the raw TxLINE
          records and independently checks the same three conditions. This is the real terminal output from running
          it against three replayable matches:
        </p>
        <pre
          className="tabular overflow-x-auto whitespace-pre rounded-md p-3 text-xs leading-relaxed"
          style={{ background: 'var(--surface-page)', border: '1px solid var(--gridline)', color: 'var(--text-secondary)' }}
        >
          {TERMINAL_OUTPUT}
        </pre>
      </section>

      <section className="rounded-lg p-4 text-sm" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>Run it yourself, offline, trusting nothing here:</strong>{' '}
        clone{' '}
        <a href="https://github.com/TheWeirdDee/veille" target="_blank" rel="noopener noreferrer" className="underline">
          github.com/TheWeirdDee/veille
        </a>
        , then <code className="tabular">npx tsx scripts/independent-verify.ts 18222446</code> against the raw data
        already committed in <code className="tabular">data/replay-cache/</code>.
      </section>
    </div>
  )
}
