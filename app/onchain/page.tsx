import { getOnchainSignals } from '@/lib/dashboard-data'
import { fetchMemosLimited } from '@/lib/solana'
import { OutcomeBadge } from '../components/OutcomeBadge'

export const dynamic = 'force-dynamic'

const DECODE_LIMIT = 30

export default async function OnchainPage() {
  const signals = await getOnchainSignals(50)
  const confirmed = signals.filter((s) => s.onchainStatus === 'confirmed')

  const toDecode = confirmed.slice(0, DECODE_LIMIT).map((s) => s.onchainTxSignature).filter((sig): sig is string => Boolean(sig))
  const memos = await fetchMemosLimited(toDecode)

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          On-chain ledger
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Every signal fire and settlement is written to Solana as a memo transaction referencing TxLINE&apos;s proof
          for that match moment. What&apos;s below is fetched and decoded live from Solana itself — not read from this
          dashboard&apos;s own database — then cross-linked to Explorer for independent verification.
        </p>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          {confirmed.length} of {signals.length} recent signals confirmed on-chain
          {confirmed.length > DECODE_LIMIT ? ` · decoding the ${DECODE_LIMIT} most recent` : ''}.
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
        <div className="flex flex-col gap-3">
          {signals.map((s) => {
            const decoded = s.onchainTxSignature ? memos.get(s.onchainTxSignature) : undefined
            return (
              <div key={s.id} className="rounded-lg p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {s.homeTeam} vs {s.awayTeam}
                    </span>
                    <span className="ml-2 text-sm" style={{ color: s.strategy === 'A' ? 'var(--series-blue)' : 'var(--series-violet)' }}>
                      Strategy {s.strategy}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <OutcomeBadge value={s.onchainStatus} />
                    {s.onchainTxSignature && (
                      <a
                        href={`https://explorer.solana.com/tx/${s.onchainTxSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tabular text-sm underline"
                      >
                        {s.onchainTxSignature.slice(0, 10)}… ↗
                      </a>
                    )}
                  </div>
                </div>

                {decoded?.memo && (
                  <div className="mt-3 rounded-md p-3 font-mono text-xs leading-relaxed" style={{ background: 'var(--surface-page)', border: '1px solid var(--gridline)', color: 'var(--text-secondary)' }}>
                    <div className="mb-1" style={{ color: 'var(--text-muted)' }}>
                      {'// decoded live from the memo instruction'}
                      {decoded.slot !== null && ` · slot ${decoded.slot}`}
                      {decoded.blockTime !== null && ` · ${new Date(decoded.blockTime * 1000).toLocaleString()}`}
                    </div>
                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(decoded.memo, null, 2)}</pre>
                  </div>
                )}
                {decoded?.error && (
                  <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Not decoded: {decoded.error}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
