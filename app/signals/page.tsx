import { getSignals } from '@/lib/dashboard-data'
import { OutcomeBadge } from '../components/OutcomeBadge'

export const dynamic = 'force-dynamic'

function pct(v: number): string {
  return `${(v * 100).toFixed(0)}%`
}

export default async function SignalsPage({
  searchParams,
}: {
  searchParams: Promise<{ strategy?: string }>
}) {
  const { strategy } = await searchParams
  const filter = strategy === 'A' || strategy === 'B' ? strategy : undefined
  const signals = await getSignals({ strategy: filter, limit: 100 })

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Signal feed
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Every fire, both strategies, most recent first.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          {[
            { label: 'All', href: '/signals' },
            { label: 'Strategy A', href: '/signals?strategy=A' },
            { label: 'Strategy B', href: '/signals?strategy=B' },
          ].map((f) => (
            <a
              key={f.label}
              href={f.href}
              className="rounded-full px-3 py-1"
              style={{
                background: (f.label === 'All' && !filter) || f.label === `Strategy ${filter}` ? 'var(--series-blue)' : 'var(--surface-1)',
                color: (f.label === 'All' && !filter) || f.label === `Strategy ${filter}` ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {f.label}
            </a>
          ))}
        </div>
      </header>

      {signals.length === 0 ? (
        <div
          className="rounded-lg p-6 text-center text-sm"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          No signals yet for this filter.
        </div>
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
