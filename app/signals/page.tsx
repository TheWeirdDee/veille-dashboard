import { getSignalMatches, getSignals } from '@/lib/dashboard-data'
import { BACKTESTS } from '@/lib/backtest'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { EmptyState } from '../components/EmptyState'

export const dynamic = 'force-dynamic'

function pct(v: number): string {
  return `${(v * 100).toFixed(0)}%`
}

function buildHref(params: { strategy?: string; match?: string; outcome?: string }): string {
  const search = new URLSearchParams()
  if (params.strategy) search.set('strategy', params.strategy)
  if (params.match) search.set('match', params.match)
  if (params.outcome) search.set('outcome', params.outcome)
  const qs = search.toString()
  return qs ? `/signals?${qs}` : '/signals'
}

function FilterRow({
  label,
  options,
  active,
}: {
  label: string
  options: { label: string; href: string; value: string | undefined }[]
  active: string | undefined
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const isActive = o.value === active
          return (
            <a
              key={o.label}
              href={o.href}
              className="rounded-full px-3 py-1 text-sm"
              style={{
                background: isActive ? 'var(--series-blue)' : 'var(--surface-1)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {o.label}
            </a>
          )
        })}
      </div>
    </div>
  )
}

export default async function SignalsPage({
  searchParams,
}: {
  searchParams: Promise<{ strategy?: string; match?: string; outcome?: string }>
}) {
  const params = await searchParams
  const strategy = params.strategy === 'A' || params.strategy === 'B' ? params.strategy : undefined
  const match = params.match || undefined
  const outcome = params.outcome || undefined

  const [signals, matches] = await Promise.all([
    getSignals({ strategy, matchId: match, outcome, limit: 100 }),
    getSignalMatches(),
  ])

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Signal feed
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Every fire, both strategies, most recent first.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 rounded-lg p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
        <FilterRow
          label="Strategy"
          active={strategy}
          options={[
            { label: 'All', href: buildHref({ match, outcome }), value: undefined },
            { label: 'A', href: buildHref({ strategy: 'A', match, outcome }), value: 'A' },
            { label: 'B', href: buildHref({ strategy: 'B', match, outcome }), value: 'B' },
          ]}
        />
        <FilterRow
          label="Outcome"
          active={outcome}
          options={[
            { label: 'All', href: buildHref({ strategy, match }), value: undefined },
            { label: 'Hit', href: buildHref({ strategy, match, outcome: 'hit' }), value: 'hit' },
            { label: 'Miss', href: buildHref({ strategy, match, outcome: 'miss' }), value: 'miss' },
            { label: 'Void', href: buildHref({ strategy, match, outcome: 'void' }), value: 'void' },
            { label: 'Pending', href: buildHref({ strategy, match, outcome: 'pending' }), value: 'pending' },
          ]}
        />
        {matches.length > 0 && (
          <FilterRow
            label="Match"
            active={match}
            options={[
              { label: 'All', href: buildHref({ strategy, outcome }), value: undefined },
              ...matches.map((m) => ({
                label: `${m.homeTeam} vs ${m.awayTeam}`,
                href: buildHref({ strategy, outcome, match: m.matchId }),
                value: m.matchId,
              })),
            ]}
          />
        )}
      </div>

      {signals.length === 0 ? (
        <EmptyState
          title="No live fires yet for this filter"
          body={`POST_EVENT_PROB_SHOCK is selective by design: it needs an underdog (<40% implied) to score or draw a red card AND the market to reprice ≥12 points within 120 seconds. The identical detector produced ${Object.values(BACKTESTS).reduce((n, b) => n + b.fires.length, 0)} fires across ${Object.keys(BACKTESTS).length} completed tournament matches — inspect every one, tick by tick, in the historical replay.`}
          ctaHref="/replay"
          ctaLabel="View backtested fires"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--gridline)' }}>
                {['Match', 'Strategy', 'Trigger', 'Position', 'Pre → Post', 'Δ', 'Outcome', 'On-chain', 'Fired'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signals.map((s, i) => {
                const preFav = s.favouredTeam === 'home' ? s.preEventHomeProb : s.preEventAwayProb
                const postFav = s.favouredTeam === 'home' ? s.postSignalHomeProb : s.postSignalAwayProb
                return (
                  <tr key={s.id} style={i < signals.length - 1 ? { borderBottom: '1px solid var(--gridline)' } : undefined}>
                    <td className="px-4 py-2.5" style={{ color: 'var(--text-primary)' }}>
                      {s.homeTeam} vs {s.awayTeam}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: s.strategy === 'A' ? 'var(--series-blue)' : 'var(--series-violet)' }}>
                      {s.strategy}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                      {s.triggerEvent.replace('_', ' ')}
                      {s.triggerMinute !== null ? ` @ ${s.triggerMinute}'` : ''}
                    </td>
                    <td className="px-4 py-2.5 capitalize" style={{ color: 'var(--text-secondary)' }}>
                      {s.position.replace('_', ' ')}
                    </td>
                    <td className="tabular px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                      {pct(preFav)} → {pct(postFav)}
                    </td>
                    <td className="tabular px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                      {pct(s.delta)}
                    </td>
                    <td className="px-4 py-2.5">
                      <OutcomeBadge value={s.outcome} />
                    </td>
                    <td className="px-4 py-2.5">
                      {s.onchainTxSignature ? (
                        <a
                          href={`https://explorer.solana.com/tx/${s.onchainTxSignature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          view ↗
                        </a>
                      ) : (
                        <OutcomeBadge value={s.onchainStatus} />
                      )}
                    </td>
                    <td className="tabular px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>
                      {new Date(s.firedAt).toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
