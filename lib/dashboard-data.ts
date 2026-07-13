/**
 * Server-side data access for every dashboard page. Single source of truth
 * so pages and any future API routes render from identical numbers.
 */

import { getSupabase } from './supabase'
import { calculateMaxDrawdown, calculateSharpe, computeHitRateStats } from './stats'
import type { HitRateStats } from './stats'

export type Strategy = 'A' | 'B'

export interface SignalReport {
  id: string
  name: string
  description: string
  deltaThreshold: number
  windowSeconds: number
  triggerEvents: string[]
  lookbackSeconds: number
  preEventProbCap: number
  cooldownSeconds: number | null
  registeredAt: string
}

export interface PortfolioReport {
  strategy: Strategy
  totalSignals: number
  totalSettled: number
  hits: number
  misses: number
  voids: number
  pnlUnits: number
  sharpeRatio: number
  maxDrawdown: number
  currentDrawdown: number
  peakPnl: number
  lastUpdated: string | null
  stats: HitRateStats
  /** Cumulative P&L after each settled position, oldest first — for the equity curve. */
  pnlSeries: number[]
}

export interface SignalFireRow {
  id: string
  strategy: Strategy
  matchId: string
  homeTeam: string
  awayTeam: string
  triggerEvent: string
  triggerMinute: number | null
  favouredTeam: string
  position: string
  preEventHomeProb: number
  preEventAwayProb: number
  postSignalHomeProb: number
  postSignalAwayProb: number
  delta: number
  outcome: string | null
  actualWinner: string | null
  onchainStatus: string
  onchainTxSignature: string | null
  recoveredFromSnapshot: boolean
  subscribersNotified: number
  subscribersFailed: number
  firedAt: string
  resolvedAt: string | null
}

export interface AgentLogRow {
  id: string
  agent: 'scout' | 'clerk'
  eventType: string
  details: Record<string, unknown> | null
  severity: 'info' | 'warning' | 'critical'
  loggedAt: string
}

export interface SubscriberRow {
  id: string
  name: string
  webhookUrl: string
  active: boolean
  strategies: string[]
  createdAt: string
  lastDeliveryAt: string | null
  totalDeliveries: number
  failedDeliveries: number
}

export interface AgentStatus {
  agent: 'scout' | 'clerk'
  lastSeen: string | null
  running: boolean
}

const toNum = (v: number | string | null): number => (v === null ? 0 : typeof v === 'number' ? v : Number(v))

export async function getSignalDefinition(): Promise<SignalReport | null> {
  const res = await getSupabase()
    .from('veille_signal_registry')
    .select('*')
    .eq('name', 'POST_EVENT_PROB_SHOCK')
    .maybeSingle()
  if (res.error || !res.data) return null
  const r = res.data as Record<string, unknown>
  return {
    id: r.id as string,
    name: r.name as string,
    description: r.description as string,
    deltaThreshold: toNum(r.delta_threshold as number),
    windowSeconds: r.window_seconds as number,
    triggerEvents: r.trigger_events as string[],
    lookbackSeconds: r.lookback_seconds as number,
    preEventProbCap: toNum(r.pre_event_prob_cap as number),
    cooldownSeconds: (r.cooldown_seconds as number) ?? null,
    registeredAt: r.registered_at as string,
  }
}

export async function getPortfolios(): Promise<Record<Strategy, PortfolioReport>> {
  const db = getSupabase()
  const [portfolioRes, signalsRes] = await Promise.all([
    db.from('veille_portfolio').select('*'),
    db.from('veille_signals').select('strategy, outcome, fired_at').not('outcome', 'is', null).order('fired_at', { ascending: true }),
  ])
  if (portfolioRes.error) throw new Error(portfolioRes.error.message)
  const rows = portfolioRes.data as Record<string, unknown>[]
  const settledByStrategy: Record<Strategy, string[]> = { A: [], B: [] }
  if (!signalsRes.error) {
    for (const s of signalsRes.data as { strategy: Strategy; outcome: string }[]) {
      if (s.outcome !== 'void') settledByStrategy[s.strategy].push(s.outcome)
    }
  }

  const result = {} as Record<Strategy, PortfolioReport>
  for (const strategy of ['A', 'B'] as Strategy[]) {
    const row = rows.find((r) => r.strategy === strategy)
    const outcomes = settledByStrategy[strategy]
    const returns = outcomes.map((o) => (o === 'hit' ? 1 : -1))
    const pnlSeries: number[] = []
    let running = 0
    for (const r of returns) {
      running += r
      pnlSeries.push(running)
    }
    const hits = outcomes.filter((o) => o === 'hit').length
    const misses = outcomes.filter((o) => o === 'miss').length

    result[strategy] = {
      strategy,
      totalSignals: (row?.total_signals as number) ?? 0,
      totalSettled: (row?.total_settled as number) ?? 0,
      hits: (row?.hits as number) ?? hits,
      misses: (row?.misses as number) ?? misses,
      voids: (row?.voids as number) ?? 0,
      pnlUnits: toNum((row?.pnl_units as number) ?? null),
      sharpeRatio: toNum((row?.sharpe_ratio as number) ?? null) || calculateSharpe(returns),
      maxDrawdown: toNum((row?.max_drawdown as number) ?? null) || calculateMaxDrawdown(pnlSeries),
      currentDrawdown: toNum((row?.current_drawdown as number) ?? null),
      peakPnl: toNum((row?.peak_pnl as number) ?? null),
      lastUpdated: (row?.last_updated as string) ?? null,
      stats: computeHitRateStats(hits, misses),
      pnlSeries,
    }
  }
  return result
}

interface SignalFireDbRow {
  id: string
  strategy: Strategy
  match_id: string
  home_team: string
  away_team: string
  trigger_event: string
  trigger_minute: number | null
  favoured_team: string
  position: string
  pre_event_home_prob: number | string
  pre_event_away_prob: number | string
  post_signal_home_prob: number | string
  post_signal_away_prob: number | string
  delta: number | string
  outcome: string | null
  actual_winner: string | null
  onchain_status: string
  onchain_tx_signature: string | null
  recovered_from_snapshot: boolean
  subscribers_notified: number
  subscribers_failed: number
  fired_at: string
  resolved_at: string | null
}

function mapFire(r: SignalFireDbRow): SignalFireRow {
  return {
    id: r.id,
    strategy: r.strategy,
    matchId: r.match_id,
    homeTeam: r.home_team,
    awayTeam: r.away_team,
    triggerEvent: r.trigger_event,
    triggerMinute: r.trigger_minute,
    favouredTeam: r.favoured_team,
    position: r.position,
    preEventHomeProb: toNum(r.pre_event_home_prob),
    preEventAwayProb: toNum(r.pre_event_away_prob),
    postSignalHomeProb: toNum(r.post_signal_home_prob),
    postSignalAwayProb: toNum(r.post_signal_away_prob),
    delta: toNum(r.delta),
    outcome: r.outcome,
    actualWinner: r.actual_winner,
    onchainStatus: r.onchain_status,
    onchainTxSignature: r.onchain_tx_signature,
    recoveredFromSnapshot: r.recovered_from_snapshot,
    subscribersNotified: r.subscribers_notified,
    subscribersFailed: r.subscribers_failed,
    firedAt: r.fired_at,
    resolvedAt: r.resolved_at,
  }
}

export async function getSignals(opts: { strategy?: Strategy; limit?: number } = {}): Promise<SignalFireRow[]> {
  let query = getSupabase()
    .from('veille_signals')
    .select('*')
    .order('fired_at', { ascending: false })
    .limit(opts.limit ?? 50)
  if (opts.strategy) query = query.eq('strategy', opts.strategy)
  const res = await query
  if (res.error) throw new Error(res.error.message)
  return (res.data as SignalFireDbRow[]).map(mapFire)
}

export async function getOnchainSignals(limit = 100): Promise<SignalFireRow[]> {
  const res = await getSupabase()
    .from('veille_signals')
    .select('*')
    .not('onchain_tx_signature', 'is', null)
    .order('fired_at', { ascending: false })
    .limit(limit)
  if (res.error) throw new Error(res.error.message)
  return (res.data as SignalFireDbRow[]).map(mapFire)
}

export async function getAgentLog(limit = 50): Promise<AgentLogRow[]> {
  const res = await getSupabase().from('veille_agent_log').select('*').order('logged_at', { ascending: false }).limit(limit)
  if (res.error) throw new Error(res.error.message)
  return (res.data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    agent: r.agent as 'scout' | 'clerk',
    eventType: r.event_type as string,
    details: r.details as Record<string, unknown> | null,
    severity: r.severity as 'info' | 'warning' | 'critical',
    loggedAt: r.logged_at as string,
  }))
}

export async function getAgentStatus(): Promise<AgentStatus[]> {
  const log = await getAgentLog(200)
  const now = Date.now()
  const thresholds: Record<'scout' | 'clerk', number> = { scout: 3 * 60_000, clerk: 11 * 60_000 }
  return (['scout', 'clerk'] as const).map((agent) => {
    const last = log.find((l) => l.agent === agent)
    const lastSeen = last?.loggedAt ?? null
    const running = lastSeen !== null && now - new Date(lastSeen).getTime() < thresholds[agent]
    return { agent, lastSeen, running }
  })
}

export async function getSubscribers(): Promise<SubscriberRow[]> {
  const res = await getSupabase()
    .from('veille_subscribers')
    .select('id, name, webhook_url, active, strategies, created_at, last_delivery_at, total_deliveries, failed_deliveries')
    .order('created_at', { ascending: false })
  if (res.error) throw new Error(res.error.message)
  return (res.data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    webhookUrl: r.webhook_url as string,
    active: r.active as boolean,
    strategies: r.strategies as string[],
    createdAt: r.created_at as string,
    lastDeliveryAt: (r.last_delivery_at as string) ?? null,
    totalDeliveries: r.total_deliveries as number,
    failedDeliveries: r.failed_deliveries as number,
  }))
}
