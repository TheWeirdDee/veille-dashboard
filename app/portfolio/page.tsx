import { getPortfolios } from '@/lib/dashboard-data'
import type { PortfolioReport } from '@/lib/dashboard-data'
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
        <StatTile label="P&L (units)" value={p.pnlUnits > 0 ? `+${p.pnlUnits}` : String(p.pnlUnits)} accent={color} />
        <StatTile label="Win rate" value={pct(p.stats.hitRate)} />
        <StatTile label="Sharpe ratio" value={p.sharpeRatio.toFixed(3)} />
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
          Same signal, opposite positions. Fixed-fractional sizing — 1 unit of notional capital per fire. The
          on-chain ledger settles which approach actually performs better across the tournament.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StrategyColumn p={portfolios.A} color="var(--series-blue)" label="long the favoured team" />
        <StrategyColumn p={portfolios.B} color="var(--series-violet)" label="short (inverse)" />
      </div>

      <section className="rounded-lg p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Cumulative P&L
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
          <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No settled positions yet.
          </div>
        ) : (
          <EquityCurve a={portfolios.A.pnlSeries} b={portfolios.B.pnlSeries} />
        )}
      </section>
    </div>
  )
}
