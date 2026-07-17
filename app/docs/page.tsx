import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Technical documentation — VEILLE',
  description:
    'How VEILLE works: architecture, the registered signal, TxLINE endpoints used, integrity model, webhook v2 spec, and deployment topology.',
}

const ENDPOINTS: Array<{ path: string; kind: string; use: string }> = [
  { path: 'POST /auth/guest', kind: 'REST', use: 'Guest JWT for all calls; auto-refresh on 401/403' },
  { path: 'activation (Solana tx + wallet signature)', kind: 'REST', use: 'One-time API token activation' },
  { path: '/scores/stream', kind: 'SSE', use: 'Live match events: goals, cards, penalties, phase changes' },
  { path: '/odds/stream', kind: 'SSE', use: 'Live consensus 1X2 odds ticks' },
  { path: '/fixtures/snapshot?competitionId=…', kind: 'REST', use: 'World Cup fixture discovery' },
  { path: '/scores/snapshot/{matchId}?asOf=…', kind: 'REST', use: 'Match state on (re)connect and at settlement' },
  { path: '/scores/historical/{matchId}', kind: 'REST', use: 'Score-event backfill after reconnect or restart' },
  { path: '/odds/snapshot/{matchId}?asOf=…', kind: 'REST', use: 'Odds baseline recovery' },
  { path: '/{feed}/updates/{day}/{hour}/{interval}', kind: 'REST', use: 'Interval backfill for replay caching' },
  { path: '/scores/stat-validation?fixtureId=…', kind: 'REST', use: 'Merkle proof fetch (implemented, awaiting proof refs in feed)' },
]

const PARAMS: Array<{ name: string; value: string; meaning: string }> = [
  { name: 'delta_threshold', value: '0.12', meaning: 'Minimum probability rise: 12 percentage points' },
  { name: 'window_seconds', value: '120', meaning: 'Shift must complete within 120 s of the trigger event' },
  { name: 'trigger_events', value: 'goal, red_card', meaning: 'Only these events arm the detector' },
  { name: 'lookback_seconds', value: '180', meaning: 'Baseline = last odds tick before the trigger, within 180 s' },
  { name: 'pre_event_prob_cap', value: '0.40', meaning: 'Favoured team must have been under 40% before the event' },
  { name: 'cooldown_seconds', value: '300', meaning: 'Per-match gate; reset at half-time and full-time' },
]

const TABLES: Array<{ name: string; role: string }> = [
  { name: 'veille_signal_registry', role: 'The pre-registered signal definition; append-only via trigger, anchored on Solana' },
  { name: 'veille_signals', role: 'One row per fire: probabilities, positions, outcome, on-chain tx signatures, dedupe key' },
  { name: 'veille_portfolio', role: 'Per-strategy outcome statistics, recomputed after every settlement' },
  { name: 'veille_match_state', role: 'Persisted per-match detector state: trigger, odds baseline, cooldown, stream sequence' },
  { name: 'veille_webhook_deliveries', role: 'Durable per-subscriber delivery ledger (idempotent, retried)' },
  { name: 'veille_webhook_receipts', role: 'Receiver-side replay protection for the Discord bridge' },
  { name: 'veille_subscribers', role: 'B2B subscribers: endpoint, HMAC secret, strategy filter' },
  { name: 'veille_agent_log / veille_agent_heartbeat', role: 'Structured event log and 60-second liveness heartbeats' },
]

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-lg p-5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <h2 className="mb-3 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-sm leading-relaxed last:mb-0" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </p>
  )
}

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Technical documentation
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          VEILLE is a deterministic World Cup odds-signal engine built on TxLINE. Two autonomous agents read the same
          live feed, run opposite strategies on one pre-registered signal, settle on-chain, and publish everything in a
          form a third party can re-verify from raw data.
        </p>
      </header>

      <Card title="Core idea">
        <P>
          One signal, <span className="tabular">POST_EVENT_PROB_SHOCK</span>, was registered in an append-only database
          row and anchored on Solana before any live fire. It detects the market underreacting to a goal or red card
          that flips a previous underdog into the favourite. Every fire opens two positions from the same detection:
          Strategy A goes long the newly favoured team, Strategy B shorts it. Identical inputs, opposite convictions —
          the tournament decides which hypothesis survives.
        </P>
        <P>
          Nothing is trusted on faith: fires and settlements are written to Solana as memo transactions, the dashboard
          re-checks every memo against the database row and the expected signer wallet, and an independent from-scratch
          verifier (zero imports from production code) re-derives all published fires from raw TxLINE records — in both
          directions, so fabricated fires would be caught too. See the Verify page for it running against real matches.
        </P>
      </Card>

      <Card title="Architecture">
        <pre
          className="tabular overflow-x-auto rounded p-4 text-xs leading-relaxed"
          style={{ background: 'var(--surface-2, rgba(0,0,0,0.25))', color: 'var(--text-secondary)' }}
        >{`TxLINE /scores/stream ─┐                          ┌─> Supabase (signals, portfolio,
TxLINE /odds/stream ───┼─> SCOUT ── SignalDetector ─┤    deliveries, match state)
snapshots + history  ──┘    (Railway service 1)     ├─> Solana memo ledger
                                                    └─> B2B webhooks (HMAC v2)

final-score snapshots ───> CLERK ── atomic claim ───> same three destinations
                            (Railway service 2)

Supabase + Solana ───────> this dashboard (Next.js on Vercel, read-only)`}</pre>
        <P>
          SCOUT consumes both SSE streams behind a resilience layer: a per-match sequence fence drops replayed records,
          an idle watchdog kills half-open sockets, and on reconnect it backfills both score events and odds ticks from
          snapshot history. Detector state — last trigger, odds baseline, cooldown, sequence — is persisted per match,
          so a process restart resumes detection instead of going blind. CLERK polls final scores every five minutes and
          settles each open position with an atomic claim, so duplicate instances cannot double-settle.
        </P>
      </Card>

      <Card title="The registered signal">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ color: 'var(--text-secondary)' }}>
                <th className="py-2 pr-4 font-medium">Parameter</th>
                <th className="py-2 pr-4 font-medium">Value</th>
                <th className="py-2 font-medium">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {PARAMS.map((p) => (
                <tr key={p.name} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="tabular py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                  <td className="tabular py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{p.value}</td>
                  <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{p.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Fires when the newly favoured team&apos;s 1X2 implied probability rises by more than the threshold within the
          window after a goal or red card, where pre-event odds implied that team was an underdog. The definition is
          locked by a database trigger; its registration timestamp and Solana anchor prove it was not tuned after
          seeing results.
        </p>
      </Card>

      <Card title="TxLINE endpoints used">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ color: 'var(--text-secondary)' }}>
                <th className="py-2 pr-4 font-medium">Endpoint</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 font-medium">Used for</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((e) => (
                <tr key={e.path} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="tabular py-2 pr-4 whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{e.path}</td>
                  <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{e.kind}</td>
                  <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{e.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Feed handling learned in production: scored penalties arrive as <span className="tabular">penalty_outcome</span>,
          never a goal action; the 1X2 market suspends for ~2–3 minutes around goals, so the odds window anchors at the
          trigger event rather than the wall clock; SSE sockets can go half-open silently; snapshots can return 403 and
          need a token refresh, not just on 401.
        </p>
      </Card>

      <Card title="Data model">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <tbody>
              {TABLES.map((t) => (
                <tr key={t.name} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="tabular py-2 pr-4 align-top whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{t.name}</td>
                  <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{t.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          RLS is enabled on every table with no public policies; only trusted server processes hold the service role.
          Signals carry a deterministic dedupe key, and all side effects (Solana writes, webhook deliveries) are durable
          rows that reconcile on startup, so transient failures retry instead of silently losing a fire.
        </p>
      </Card>

      <Card title="Webhook v2 (B2B delivery)">
        <P>
          Every fire and settlement is delivered to each registered subscriber as a signed POST. The signature is
          HMAC-SHA256 over the exact raw request body in <span className="tabular">X-VEILLE-Signature</span>, with a
          stable <span className="tabular">X-VEILLE-Delivery-Id</span> for dedupe and{' '}
          <span className="tabular">X-VEILLE-Timestamp</span> for freshness. Receivers return non-2xx on failure and
          VEILLE retries; the Discord bridge on this site is itself a reference receiver with replay protection.
        </P>
      </Card>

      <Card title="Honest metrics and limits">
        <P>
          Portfolio numbers are an outcome score: a hit is +1, a miss is −1. They are not executable trading P&amp;L —
          entry prices, stake sizing, fees, liquidity, and slippage are not modeled. Solana memos currently carry{' '}
          <span className="tabular">txline_proof: null</span> because the agent feed does not yet supply a fetchable
          proof reference; VEILLE does not claim native TxLINE proof validation until it does. Live fires are never
          backfilled: a fire missed live stays missed and is documented, and replayed history is labeled as replay.
        </P>
      </Card>

      <Card title="Links">
        <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <li>
            Engine repository (SCOUT, CLERK, verifier):{' '}
            <a className="underline" href="https://github.com/TheWeirdDee/Vielle" style={{ color: 'var(--series-blue)' }}>
              github.com/TheWeirdDee/Vielle
            </a>
          </li>
          <li>
            Dashboard repository:{' '}
            <a className="underline" href="https://github.com/TheWeirdDee/veille-dashboard" style={{ color: 'var(--series-blue)' }}>
              github.com/TheWeirdDee/veille-dashboard
            </a>
          </li>
          <li>
            TxLINE documentation:{' '}
            <a className="underline" href="https://txline.txodds.com/documentation/quickstart" style={{ color: 'var(--series-blue)' }}>
              txline.txodds.com/documentation/quickstart
            </a>
          </li>
        </ul>
      </Card>
    </div>
  )
}
