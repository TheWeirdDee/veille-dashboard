import { getLandingStats } from '@/lib/dashboard-data'
import { BACKTESTS } from '@/lib/backtest'
import { SignalWaveform } from './components/SignalWaveform'
import {
  ArrowRightIcon,
  ChainIcon,
  CheckIcon,
  ClockIcon,
  GithubIcon,
  LayersIcon,
  PulseIcon,
  SendIcon,
  ShieldIcon,
} from './components/Icon'

export const dynamic = 'force-dynamic'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest"
      style={{ color: 'var(--text-muted)' }}
    >
      {children}
    </div>
  )
}

function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
      style={{ background: 'var(--series-blue)', color: '#fff' }}
    >
      {children}
      <ArrowRightIcon size={15} />
    </a>
  )
}

function SecondaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
      style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
    >
      {children}
    </a>
  )
}

function SectionHeading({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string
  title: string
  lede?: string
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-2xl font-semibold sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h2>
      {lede && (
        <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {lede}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function Landing() {
  const stats = await getLandingStats()

  return (
    <div>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <Eyebrow>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--status-good)' }} />
              TxODDS World Cup Hackathon · Trading Tools &amp; Agents
            </Eyebrow>
            <h1
              className="text-4xl font-semibold leading-[1.1] sm:text-5xl"
              style={{ color: 'var(--text-primary)' }}
            >
              The signal was registered before the first ball was kicked.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
              VEILLE watches every live World Cup match on TxLINE&apos;s odds and scores feeds, detects one
              pre-registered probability shock, and trades it two opposite ways at once. Every position settles
              autonomously. Every fire is persisted first, then queued for Solana and subscriber delivery. Nothing
              here can be tuned after the fact.
            </p>
            {(() => {
              const all = Object.values(BACKTESTS)
              const fires = all.flatMap((b) => b.fires)
              const aFires = fires.filter((f) => f.strategy === 'A')
              const aHits = aFires.filter((f) => f.outcome === 'hit').length
              const hitRate = aFires.length > 0 ? Math.round((aHits / aFires.length) * 100) : 0
              return (
                <a
                  href="/replay"
                  className="mt-6 inline-flex max-w-xl flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-4 py-3 text-sm leading-relaxed"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  <span className="tabular font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {fires.length} signal fires
                  </span>
                  across
                  <span className="tabular font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {all.length} completed matches
                  </span>
                  · Strategy A hit rate
                  <span className="tabular font-semibold" style={{ color: 'var(--series-blue)' }}>
                    {hitRate}%
                  </span>
                  · every published fire independently recomputed
                  <ArrowRightIcon size={14} />
                </a>
              )
            })()}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <PrimaryButton href="/replay">Replay a real match</PrimaryButton>
              <SecondaryButton href="/dashboard">View live dashboard</SecondaryButton>
            </div>

            {/* live status strip — real numbers, honest zero-state */}
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-6 sm:grid-cols-4" style={{ borderColor: 'var(--gridline)' }}>
              <div>
                <dt className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Agents live
                </dt>
                <dd className="tabular mt-0.5 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {stats.agentsRunning} / 2
                </dd>
              </div>
              <div>
                <dt className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Signals fired
                </dt>
                <dd className="tabular mt-0.5 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {stats.totalSignals}
                </dd>
              </div>
              <div>
                <dt className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  On-chain confirmations
                </dt>
                <dd className="tabular mt-0.5 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {stats.totalOnchainConfirmed}
                </dd>
              </div>
              <div>
                <dt className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Signal registered
                </dt>
                <dd className="mt-0.5 text-sm font-medium" style={{ color: 'var(--status-good)' }}>
                  {stats.registeredAt ? formatDate(stats.registeredAt) : 'pending'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl p-6" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <SignalWaveform />
            <div className="mt-4 flex items-center justify-center gap-6 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: 'var(--series-blue)' }} />
                Strategy A — long the favoured team
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: 'var(--series-violet)' }} />
                Strategy B — inverse (short)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* The problem                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <SectionHeading
            eyebrow="The problem"
            title="Markets move on headlines. They don't always move correctly."
            lede="When a goal or red card flips the balance of a match, odds move fast — but not always by the right amount, and not always instantly. VEILLE's hypothesis: markets systematically underreact to high-impact events when the newly-favoured team was previously the underdog."
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg p-5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Condition 1
              </div>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Win probability shifts <strong style={{ color: 'var(--text-primary)' }}>≥12%</strong> within a{' '}
                <strong style={{ color: 'var(--text-primary)' }}>120-second</strong> rolling window.
              </p>
            </div>
            <div className="rounded-lg p-5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Condition 2
              </div>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                A <strong style={{ color: 'var(--text-primary)' }}>goal or red card</strong> occurred within the
                preceding <strong style={{ color: 'var(--text-primary)' }}>180 seconds</strong>.
              </p>
            </div>
            <div className="rounded-lg p-5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Condition 3
              </div>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Pre-event odds implied <strong style={{ color: 'var(--text-primary)' }}>&lt;40%</strong> for the
                team now favoured — they were the underdog a moment ago.
              </p>
            </div>
          </div>

          {/* honest, labeled backtest case study — real numbers from a real match, never presented as a live production fire */}
          <a
            href="/replay?match=18222446"
            className="mt-6 block overflow-hidden rounded-lg transition-opacity hover:opacity-90"
            style={{ border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between px-5 py-3 text-xs font-medium uppercase tracking-wide" style={{ background: 'var(--surface-1)', color: 'var(--text-muted)' }}>
              <span>Validated against historical World Cup data — not a live production fire</span>
              <span style={{ color: 'var(--series-blue)' }}>Replay this match →</span>
            </div>
            <div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center" style={{ background: 'var(--surface-1)' }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Argentina vs Switzerland
                </div>
                <div className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  72&apos; — Switzerland red card
                </div>
                <div className="tabular mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Argentina implied probability: <span style={{ color: 'var(--text-primary)' }}>32.1%</span> pre-event
                </div>
              </div>
              <div className="hidden justify-self-center sm:block" style={{ color: 'var(--text-muted)' }}>
                <ArrowRightIcon size={20} />
              </div>
              <div>
                <div className="tabular text-sm" style={{ color: 'var(--text-secondary)' }}>
                  → <span style={{ color: 'var(--series-blue)', fontWeight: 600 }}>46.1%</span> within 114 seconds
                  <span className="ml-1" style={{ color: 'var(--text-muted)' }}>
                    (+14.0pp, over threshold)
                  </span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: 'var(--status-good-bg)', color: 'var(--status-good)' }}>
                  <CheckIcon size={12} />
                  Argentina won 3–1 (ET) — signal hit
                </div>
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section id="how-it-works" className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <SectionHeading
            eyebrow="How it works"
            title="One signal. Two opposite bets. Let the tournament decide."
            lede="Every time the signal fires, VEILLE opens both positions simultaneously from the same observation — proving which approach actually works empirically, not by argument."
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg p-6" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderTop: '3px solid var(--series-blue)' }}>
              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--series-blue)' }}>
                Strategy A — Long
              </div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Bets that the market is right to shift — takes a long position on the newly-favoured team when the
                signal fires.
              </p>
            </div>
            <div className="rounded-lg p-6" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderTop: '3px solid var(--series-violet)' }}>
              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--series-violet)' }}>
                Strategy B — Short (inverse)
              </div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Bets that the market overcorrected — takes the opposite position on the exact same trigger, same
                moment, same match.
              </p>
            </div>
          </div>

          <p className="mx-auto mt-6 max-w-2xl text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Performance uses a transparent +1 hit / -1 miss outcome score; it is not execution profit or loss.
            A five-minute cooldown per match (reset at half-time and full-time) stops a goal immediately followed by
            a card from producing signal clusters.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Four layers                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <SectionHeading
            eyebrow="Architecture"
            title="Four layers, each doing exactly one job"
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: <PulseIcon size={22} />,
                title: 'Signal engine',
                body: 'SCOUT watches TxLINE’s live odds and scores streams across every active match simultaneously. Deterministic conditional logic — no ML, no black box. Every fire is auditable line by line.',
              },
              {
                icon: <LayersIcon size={22} />,
                title: 'Portfolio management',
                body: 'CLERK settles every position against the actual outcome and recomputes hit rate, confidence intervals, outcome-score ratio, and drawdown. No execution-return claim is made without prices, fees, and slippage.',
              },
              {
                icon: <ChainIcon size={22} />,
                title: 'On-chain ledger',
                body: 'Every fire and settlement is queued for the Solana Memo program. The dashboard verifies the configured wallet signer and memo fields; native TxLINE proof references are explicitly marked unavailable.',
              },
              {
                icon: <SendIcon size={22} />,
                title: 'Subscriber protocol',
                body: 'Registered B2B endpoints receive an HMAC-SHA256-signed webhook within seconds of every fire and settlement — a trading desk can build automated execution on top without touching this dashboard.',
              },
            ].map((layer) => (
              <div key={layer.title} className="flex gap-4 rounded-lg p-5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'var(--series-blue-track)', color: 'var(--series-blue)' }}
                >
                  {layer.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {layer.title}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {layer.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Production readiness                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <SectionHeading
            eyebrow="Production readiness"
            title="Every failure mode is handled without a human"
            lede="A hackathon demo that only works when nothing goes wrong isn't production-ready. Here's what happens when things do."
          />

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {[
              ['SSE connection drops', 'Exponential backoff reconnect (1s → 2s → 4s → 8s → 16s → 30s), then retries every 30s.'],
              ['A reconnect happens mid-match', 'Snapshot recovery replays any events missed during the gap before resuming live.'],
              ['The guest JWT expires', 'Renewed automatically on 401, before the next reconnect attempt.'],
              ['A match is abandoned', 'Every open position for that match is voided and excluded from win-rate statistics.'],
              ['A match is postponed', 'Positions are held; CLERK re-checks on every 5-minute poll until it resumes.'],
              ['A Solana write fails', 'Retried up to 3 times. The signal is already durable in Supabase — it is never silently dropped.'],
              ['A subscriber webhook fails', 'Retried up to 3 times per subscriber; failures are logged, not swallowed.'],
              ['Anything else happens', 'Logged to the agent log with a severity level — visible on this dashboard, not buried in a console.'],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3 rounded-lg p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <div className="mt-0.5 shrink-0" style={{ color: 'var(--status-good)' }}>
                  <CheckIcon size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {title}
                  </div>
                  <div className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* For trading desks                                                */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <Eyebrow>
                <ShieldIcon size={14} />
                Built to be verified, not trusted
              </Eyebrow>
              <h2 className="text-2xl font-semibold sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
                For trading desks and market operators
              </h2>
              <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                A trading desk doesn&apos;t need to trust this dashboard&apos;s numbers &mdash; every signal and
                settlement memo is independently checkable on Solana Explorer and compared with its database record.
                Native TxLINE proof validation is not claimed. Subscriber delivery is HMAC-authenticated and replay-protected.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <SecondaryButton href="/onchain">View on-chain ledger</SecondaryButton>
                <SecondaryButton href="/subscribers">Subscriber status</SecondaryButton>
              </div>
            </div>

            <div className="rounded-lg p-5 font-mono text-xs leading-relaxed" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <div style={{ color: 'var(--text-muted)' }}>{'// exact body signed in X-VEILLE-Signature'}</div>
              <pre className="mt-2 whitespace-pre-wrap break-words">{`{
  "veille_version": 2,
  "delivery_id": "signal:event:subscriber",
  "sent_at": 1784000000000,
  "event": "signal_fired",
  "strategy": "A",
  "match_id": "18222446",
  "trigger_event": "red_card",
  "favoured_team": "home",
  "position": "long_home",
  "pre_event_prob": 0.321,
  "post_signal_prob": 0.461,
  "delta": 0.140,
  "onchain_tx": "5TCB2qpL..."
}`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Final CTA                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-24">
          <h2 className="text-2xl font-semibold sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
            No fabricated numbers, live or historical.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Live numbers come from the same database the agents write to. Historical replays come from TxLINE&apos;s
            real record of matches that already happened. Nothing on this site is staged.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <PrimaryButton href="/replay">Replay a real match</PrimaryButton>
            <SecondaryButton href="/dashboard">Live dashboard</SecondaryButton>
            <SecondaryButton href="https://github.com/TheWeirdDee/Vielle">
              <GithubIcon size={16} />
              Source
            </SecondaryButton>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                VEILLE
              </div>
              <p className="mt-2 max-w-xs text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Autonomous odds intelligence. Two agents, one pre-registered signal, zero human input.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <ClockIcon size={13} />
                {stats.registeredAt ? `Signal pre-registered ${formatDate(stats.registeredAt)}` : 'Signal pending registration'}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Product
              </div>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {[
                  ['Dashboard', '/dashboard'],
                  ['Replay', '/replay'],
                  ['Signals', '/signals'],
                  ['Portfolio', '/portfolio'],
                  ['On-chain ledger', '/onchain'],
                ].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} style={{ color: 'var(--text-secondary)' }}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Operations
              </div>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {[
                  ['Subscribers', '/subscribers'],
                  ['Agent log', '/agent-log'],
                ].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} style={{ color: 'var(--text-secondary)' }}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Resources
              </div>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                <li>
                  <a href="https://github.com/TheWeirdDee/Vielle" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}>
                    GitHub — agents
                  </a>
                </li>
                <li>
                  <a href="https://github.com/TheWeirdDee/veille-dashboard" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}>
                    GitHub — dashboard
                  </a>
                </li>
                <li>
                  <a href="https://explorer.solana.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}>
                    Solana Explorer
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div
            className="mt-10 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: 'var(--gridline)', color: 'var(--text-muted)' }}
          >
            <span>Built by Divine (@TheWeirdDee) · Lagos, Nigeria</span>
            <span>TxODDS World Cup Hackathon · Trading Tools &amp; Agents track · 2026</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
