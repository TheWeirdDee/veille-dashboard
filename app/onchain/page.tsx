import { getOnchainSignals } from '@/lib/dashboard-data'
import { OutcomeBadge } from '../components/OutcomeBadge'

export const dynamic = 'force-dynamic'

export default async function OnchainPage() {
  const signals = await getOnchainSignals(100)
  const confirmed = signals.filter((s) => s.onchainStatus === 'confirmed').length

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          On-chain ledger
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Every signal fire and settlement is written to Solana as a memo transaction referencing TxLINE&apos;s
          proof for that match moment. Click any transaction to verify independently on Solana Explorer — nothing
          here requires trusting this dashboard.
        </p>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          {confirmed} of {signals.length} recent signals confirmed on-chain.
        </p>
      </header>

      {signals.length === 0 ? (
        <div
          className="rounded-lg p-6 text-center text-sm"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          No on-chain transactions yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--gridline)' }}>
                {['Match', 'Strategy', 'Status', 'Transaction', 'Fired'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signals.map((s, i) => (
                <tr key={s.id} style={i < signals.length - 1 ? { borderBottom: '1px solid var(--gridline)' } : undefined}>
                  <td className="px-4 py-2.5" style={{ color: 'var(--text-primary)' }}>
                    {s.homeTeam} vs {s.awayTeam}
                  </td>
                  <td className="px-4 py-2.5" style={{ color: s.strategy === 'A' ? 'var(--series-blue)' : 'var(--series-violet)' }}>
                    {s.strategy}
                  </td>
                  <td className="px-4 py-2.5">
                    <OutcomeBadge value={s.onchainStatus} />
                  </td>
                  <td className="px-4 py-2.5">
                    {s.onchainTxSignature ? (
                      <a
                        href={`https://explorer.solana.com/tx/${s.onchainTxSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tabular underline"
                      >
                        {s.onchainTxSignature.slice(0, 12)}… ↗
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
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
    </div>
  )
}
