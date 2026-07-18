import { getOnchainSignals, getRegistrationAnchor, getSignalDefinition } from '@/lib/dashboard-data'
import type { SignalFireRow } from '@/lib/dashboard-data'
import { fetchMemosLimited } from '@/lib/solana'
import type { ExpectedMemo } from '@/lib/solana'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { EmptyState } from '../components/EmptyState'

export const dynamic = 'force-dynamic'
const DECODE_LIMIT = 30

interface Entry {
  key: string
  kind: 'signal' | 'settlement'
  signature: string
  status: string
  signal: SignalFireRow
  expected: ExpectedMemo
}

function entriesFor(signals: SignalFireRow[]): Entry[] {
  return signals.flatMap((signal) => {
    const entries: Entry[] = []
    if (signal.onchainTxSignature) {
      entries.push({
        key: `${signal.id}:signal`, kind: 'signal', signature: signal.onchainTxSignature,
        status: signal.onchainStatus, signal,
        expected: {
          type: 'signal', signalId: signal.id, strategy: signal.strategy, matchId: signal.matchId,
          triggerEvent: signal.triggerEvent, favouredTeam: signal.favouredTeam, delta: signal.delta,
          firedAt: new Date(signal.firedAt).getTime(),
        },
      })
    }
    if (signal.settlementOnchainTxSignature && signal.outcome && signal.resolvedAt) {
      entries.push({
        key: `${signal.id}:settlement`, kind: 'settlement', signature: signal.settlementOnchainTxSignature,
        status: signal.settlementOnchainStatus, signal,
        expected: {
          type: 'settlement', signalId: signal.id, strategy: signal.strategy, matchId: signal.matchId,
          outcome: signal.outcome, resolvedAt: new Date(signal.resolvedAt).getTime(),
        },
      })
    }
    return entries
  })
}

export default async function OnchainPage() {
  const [signals, anchor, definition] = await Promise.all([
    getOnchainSignals(50), getRegistrationAnchor(), getSignalDefinition(),
  ])
  const entries = entriesFor(signals)
  const decode = entries.filter((e) => e.status === 'confirmed').slice(0, DECODE_LIMIT)
    .map((e) => ({ signature: e.signature, expected: e.expected }))
  if (anchor && definition) {
    decode.push({
      signature: anchor.txSignature,
      expected: {
        type: 'registration', signalId: definition.id, name: definition.name,
        deltaThreshold: definition.deltaThreshold, windowSeconds: definition.windowSeconds,
        triggerEvents: definition.triggerEvents, lookbackSeconds: definition.lookbackSeconds,
        preEventProbCap: definition.preEventProbCap, cooldownSeconds: definition.cooldownSeconds,
        registeredAt: definition.registeredAt,
      },
    })
  }
  const memos = await fetchMemosLimited(decode)
  const anchorDecoded = anchor ? memos.get(anchor.txSignature) : undefined
  const confirmed = entries.filter((e) => e.status === 'confirmed').length

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>On-chain ledger</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Solana memos are compared field-by-field with the database record and configured VEILLE wallet signer.
          A decoded memo alone is not treated as proof.
        </p>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          {confirmed} of {entries.length} recent entries confirmed. TxLINE proof references are not currently
          available, so this page does not claim native TxLINE proof validation.
        </p>
      </header>

      {anchor && (
        <section className="mb-6 rounded-lg p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Signal definition registration</div>
              <div className="mt-0.5 text-xs" style={{ color: anchorDecoded?.verified ? 'var(--status-good)' : 'var(--status-critical)' }}>
                {anchorDecoded?.verified ? 'Signer and every registered parameter match the memo.' :
                  `Not fully verified${anchorDecoded ? `: ${anchorDecoded.verificationErrors.join('; ')}` : '.'}`}
              </div>
            </div>
            <a href={`https://explorer.solana.com/tx/${anchor.txSignature}`} target="_blank" rel="noreferrer" className="tabular text-xs underline">
              {anchor.txSignature.slice(0, 8)}…{anchor.txSignature.slice(-8)} ↗
            </a>
          </div>
          {anchorDecoded?.memo && (
            <div className="mt-3 rounded-md p-3 font-mono text-xs" style={{ background: 'var(--surface-page)', border: '1px solid var(--gridline)', color: 'var(--text-secondary)' }}>
              <div className="mb-1" style={{ color: 'var(--text-muted)' }}>
                {'// decoded from Solana and compared field-by-field with veille_signal_registry'}
                {anchorDecoded.slot !== null && ` · slot ${anchorDecoded.slot}`}
                {anchorDecoded.signer && ` · signer ${anchorDecoded.signer.slice(0, 6)}…${anchorDecoded.signer.slice(-6)}`}
              </div>
              <pre className="whitespace-pre-wrap break-words">{JSON.stringify(anchorDecoded.memo, null, 2)}</pre>
            </div>
          )}
        </section>
      )}

      {entries.length === 0 ? (
        <EmptyState title="No live ledger entries yet" body="The ledger begins with the first live signal; backtests are never anchored retroactively." ctaHref="/verify" ctaLabel="Inspect the registered definition" />
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => {
            const decoded = memos.get(entry.signature)
            const signal = entry.signal
            return (
              <section key={entry.key} className="rounded-lg p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div style={{ color: 'var(--text-primary)' }}>
                    {signal.homeTeam} vs {signal.awayTeam}
                    <span className="ml-2 text-sm" style={{ color: signal.strategy === 'A' ? 'var(--series-blue)' : 'var(--series-violet)' }}>
                      Strategy {signal.strategy} · {entry.kind}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <OutcomeBadge value={entry.status} />
                    {decoded && <span className="text-xs" style={{ color: decoded.verified ? 'var(--status-good)' : 'var(--status-critical)' }}>
                      {decoded.verified ? 'record verified' : 'mismatch'}
                    </span>}
                    <a href={`https://explorer.solana.com/tx/${entry.signature}`} target="_blank" rel="noopener noreferrer" className="tabular text-sm underline">
                      {entry.signature.slice(0, 10)}… ↗
                    </a>
                  </div>
                </div>
                {decoded?.memo && (
                  <div className="mt-3 rounded-md p-3 font-mono text-xs" style={{ background: 'var(--surface-page)', border: '1px solid var(--gridline)', color: 'var(--text-secondary)' }}>
                    <div className="mb-1" style={{ color: 'var(--text-muted)' }}>
                      {'// decoded from Solana and compared with VEILLE record'}{decoded.slot !== null && ` · slot ${decoded.slot}`}
                    </div>
                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(decoded.memo, null, 2)}</pre>
                  </div>
                )}
                {decoded && !decoded.verified && <p className="mt-2 text-xs" style={{ color: 'var(--status-critical)' }}>
                  {decoded.verificationErrors.join('; ')}
                </p>}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
