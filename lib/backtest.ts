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

import argentinaVsSwitzerland from '@/data/backtest/18222446.json'
import norwayVsEngland from '@/data/backtest/18213979.json'

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

export const BACKTESTS: Record<string, BacktestResult> = {
  '18222446': argentinaVsSwitzerland as BacktestResult,
  '18213979': norwayVsEngland as BacktestResult,
}

export const DEFAULT_BACKTEST_MATCH = '18222446'

export function getBacktest(matchId?: string): BacktestResult {
  return BACKTESTS[matchId ?? ''] ?? BACKTESTS[DEFAULT_BACKTEST_MATCH]
}
