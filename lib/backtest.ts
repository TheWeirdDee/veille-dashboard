/**
 * Bundled historical backtests — precomputed once via
 * veille/scripts/precompute-backtest.ts using the exact same SignalDetector
 * and replay engine SCOUT runs live. Static data: historical matches never
 * change, so there's nothing to compute at request time and no TxLINE
 * credentials needed in this repo.
 *
 * This is what makes the product demoable regardless of whether a match
 * happens to be live when someone visits — the tournament doesn't have to
 * be running for the signal's logic to be inspectable end to end.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

export type EventType =
  | 'goal'
  | 'red_card'
  | 'yellow_card'
  | 'corner'
  | 'phase_change'
  | 'substitution'
  | 'var'
  | 'var_end'
  | 'shot'
  | 'free_kick'
  | 'penalty'

export interface KeyEvent {
  type: EventType
  team: 'home' | 'away' | null
  minute: number
  timestamp: number
}

export interface BacktestFire {
  strategy: 'A' | 'B'
  triggerEvent: string
  triggerMinute: number
  preEventHomeProb: number
  preEventAwayProb: number
  postSignalHomeProb: number
  postSignalAwayProb: number
  delta: number
  windowSeconds: number
  favouredTeam: 'home' | 'away'
  position: string
  outcome: 'hit' | 'miss'
  actualWinner: 'home' | 'away' | 'draw'
  firedAt: number
}

export interface BacktestResult {
  matchId: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  phase: string
  winner: 'home' | 'away' | 'draw'
  keyEvents: KeyEvent[]
  fires: BacktestFire[]
  computedAt: string
}

const BACKTEST_DIR = path.join(process.cwd(), 'data', 'backtest')

function loadAll(): Record<string, BacktestResult> {
  // Numeric-string keys iterate in ascending order, and TxLINE fixture ids
  // increase over time, so Object.values() comes out roughly chronological.
  const out: Record<string, BacktestResult> = {}
  for (const file of fs.readdirSync(BACKTEST_DIR)) {
    if (!file.endsWith('.json')) continue
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(BACKTEST_DIR, file), 'utf8')) as BacktestResult
      if (parsed.matchId && Array.isArray(parsed.fires)) out[parsed.matchId] = parsed
    } catch {
      // skip unreadable file
    }
  }
  return out
}

export const BACKTESTS: Record<string, BacktestResult> = loadAll()

/** Newest completed match — fixture ids increase over time. */
export const DEFAULT_BACKTEST_MATCH = Object.keys(BACKTESTS).at(-1) ?? ''

export function getBacktest(matchId?: string): BacktestResult {
  return BACKTESTS[matchId ?? ''] ?? BACKTESTS[DEFAULT_BACKTEST_MATCH]
}
