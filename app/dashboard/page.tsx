import { getAgentStatus, getPortfolios, getSignalDefinition, getSignals, getSignalsFiredToday, getTrackedMatches } from '@/lib/dashboard-data'
import { StatTile } from '../components/StatTile'
import { OutcomeBadge } from '../components/OutcomeBadge'

export const dynamic = 'force-dynamic'

function pct(v: number | null): string {
  return v === null ? '—' : `${(v * 100).toFixed(1)}%`
}

const PHASE_LABEL: Record<string, string> = {
  NS: 'not started',
  H1: 'first half',
  HT: 'half-time',
  H2: 'second half',
  F: 'full-time',
  ET1: 'extra time',
  ET2: 'extra time',
  FET: 'full-time (AET)',
  PE: 'penalties',
  FPE: 'full-time (pens)',
  I: 'interrupted',
}

export default async function Overview() {
  const [signal, portfolios, status, recent, signalsToday, tracked] = await Promise.all([
    getSignalDefinition(),
    getPortfolios(),
    getAgentStatus(),
    getSignals({ limit: 5 }),
    getSignalsFiredToday(),
    getTrackedMatches(3),
  ])

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Live agent status, the pre-registered signal, and the most recent fires.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {status.map((s) => (
          <div key={s.agent} className="rounded-lg p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                VEILLE {s.agent}
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  background: s.running ? 'var(--status-good-bg)' : 'var(--status-muted-bg)',
                  color: s.running ? 'var(--status-good)' : 'var(--text-secondary)',
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: s.running ? 'var(--status-good)' : 'var(--text-muted)' }}
                />
                {s.running ? 'Running' : 'Idle'}
              </span>
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {s.lastSeen ? `Last seen ${new Date(s.lastSeen).toLocaleString()}` : 'Never seen'}
            </div>
          </div>
        ))}
      </section>

      {tracked.length > 0 && (
        <section className="mb-8 rounded-lg p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Feed activity — what SCOUT is watching
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            Updated on every TxLINE scores event. A green heartbeat proves the process is alive; this proves the data
            feed is actually delivering.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {tracked.map((m) => {
              const ageMin = Math.round((Date.now() - new Date(m.lastUpdated).getTime()) / 60_000)
              const live = !['F', 'FET', 'FPE', 'C', 'A', 'NS'].includes(m.phase) && ageMin < 10
              return (
                <div key={m.matchId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span style={{ color: 'var(--text-primary)' }}>
                    {m.homeTeam} <span className="tabular">{m.homeScore}–{m.awayScore}</span> {m.awayTeam}
                    <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {m.minute > 0 ? `${m.minute}′ · ` : ''}
                      {PHASE_LABEL[m.phase] ?? m.phase}
                    </span>
                  </span>
                  <span className="tabular text-xs" style={{ color: live ? 'var(--status-good)' : 'var(--text-muted)' }}>
                    {live ? 'live — ' : ''}
                    {ageMin < 1 ? 'updated just now' : ageMin < 60 ? `updated ${ageMin}m ago` : `updated ${new Date(m.lastUpdated).toLocaleString()}`}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {signal && (
        <section
          className="mb-8 rounded-lg p-4"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {signal.name}
            </h2>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: 'var(--status-good-bg)', color: 'var(--status-good)' }}
              title="registered_at is immutable — set before results were known"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--status-good)' }} />
              Pre-registered {new Date(signal.registeredAt).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {signal.description}
          </p>
        </section>
      )}

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="Signals today" value={String(signalsToday)} sub="since UTC midnight" />
        <StatTile label="Strategy A settled" value={String(portfolios.A.totalSignals)} sub="long the favoured team" />
        <StatTile label="Strategy A hit rate" value={pct(portfolios.A.stats.hitRate)} accent="var(--series-blue)" />
        <StatTile label="Strategy B settled" value={String(portfolios.B.totalSignals)} sub="inverse (short)" />
        <StatTile label="Strategy B hit rate" value={pct(portfolios.B.stats.hitRate)} accent="var(--series-violet)" />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Latest signals
          </h2>
          <a href="/signals" className="text-sm underline">
            View all →
          </a>
        </div>
        {recent.length === 0 ? (
          <div
            className="rounded-lg p-6 text-center text-sm"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            No signals fired yet. SCOUT is watching TxLINE&apos;s live streams — this fills in as matches produce
            qualifying odds shocks.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <table className="w-full min-w-[640px] text-left text-sm">
              <tbody>
                {recent.map((s, i) => (
                  <tr key={s.id} style={i < recent.length - 1 ? { borderBottom: '1px solid var(--gridline)' } : undefined}>
                    <td className="px-4 py-2.5" style={{ color: 'var(--text-primary)' }}>
                      {s.homeTeam} vs {s.awayTeam}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: s.strategy === 'A' ? 'var(--series-blue)' : 'var(--series-violet)' }}>
                      Strategy {s.strategy}
                    </td>
                    <td className="px-4 py-2.5 capitalize" style={{ color: 'var(--text-secondary)' }}>
                      {s.position.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-2.5">
                      <OutcomeBadge value={s.outcome} />
                    </td>
                    <td className="tabular px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>
                      {new Date(s.firedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
