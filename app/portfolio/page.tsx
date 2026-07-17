import { getPortfolios } from '@/lib/dashboard-data'
import type { PortfolioReport } from '@/lib/dashboard-data'
import { BACKTESTS } from '@/lib/backtest'
import { StatTile } from '../components/StatTile'
import { EquityCurve } from '../components/EquityCurve'

export const dynamic = 'force-dynamic'

function pct(v: number | null): string {
  return v === null ? '—' : `${(v * 100).toFixed(1)}%`
}

function StrategyColumn({ p, color, label }: { p: PortfolioReport; color: string; label: string }) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Strategy {p.strategy}
        </h2>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile label="Outcome score" value={p.pnlUnits > 0 ? `+${p.pnlUnits}` : String(p.pnlUnits)} accent={color} />
        <StatTile label="Win rate" value={pct(p.stats.hitRate)} />
        <StatTile label="Hit-score ratio" value={p.sharpeRatio.toFixed(3)} />
        <StatTile label="Max drawdown" value={String(p.maxDrawdown)} />
      </div>
      <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        {p.hits}W–{p.misses}L, {p.voids} void · 95% CI {pct(p.stats.ciLower)}–{pct(p.stats.ciUpper)} · n={p.stats.total}
        {p.stats.pValue !== null && <> · p={p.stats.pValue.toFixed(4)} vs coin flip</>}
      </div>
    </div>
  )
}

export default async function PortfolioPage() {
  const portfolios = await getPortfolios()

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Portfolio — Strategy A vs B
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Same signal, opposite outcome hypotheses. Each hit scores +1 and each miss -1. These are classification
          results, not executable prices, fees, slippage, or trading returns.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StrategyColumn p={portfolios.A} color="var(--series-blue)" label="long the favoured team" />
        <StrategyColumn p={portfolios.B} color="var(--series-violet)" label="short (inverse)" />
      </div>

      <section className="rounded-lg p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Cumulative outcome score
          </h2>
          <div className="flex gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: 'var(--series-blue)' }} />
              Strategy A
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: 'var(--series-violet)' }} />
              Strategy B
            </span>
          </div>
        </div>
        {portfolios.A.pnlSeries.length === 0 && portfolios.B.pnlSeries.length === 0 ? (
          (() => {
            const fires = Object.values(BACKTESTS).flatMap((b) => b.fires)
            const aFires = fires.filter((f) => f.strategy === 'A')
            const aHits = aFires.filter((f) => f.outcome === 'hit').length
            return (
              <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                <p>No settled live positions yet — this curve starts at the first live fire.</p>
                <p className="mt-2">
                  Across the tournament backtest the same detector settled {aFires.length} Strategy A positions:{' '}
                  <span style={{ color: 'var(--text-primary)' }}>
                    {aHits} hits / {aFires.length - aHits} misses ({aFires.length > 0 ? Math.round((aHits / aFires.length) * 100) : 0}% hit rate)
                  </span>
                  .{' '}
                  <a href="/replay" style={{ color: 'var(--series-blue)' }}>
                    Inspect every fire →
                  </a>
                </p>
              </div>
            )
          })()
        ) : (
          <EquityCurve a={portfolios.A.pnlSeries} b={portfolios.B.pnlSeries} />
        )}
      </section>
    </div>
  )
}
