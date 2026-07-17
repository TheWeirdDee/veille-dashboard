import 'server-only'
import { Connection } from '@solana/web3.js'

const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'

let connection: Connection | null = null
function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(
      process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com',
      'confirmed'
    )
  }
  return connection
}

export interface ExpectedMemo {
  type: 'signal' | 'settlement' | 'registration'
  signalId: string
  strategy?: string
  matchId?: string
  triggerEvent?: string
  favouredTeam?: string
  delta?: number
  firedAt?: number
  outcome?: string
  resolvedAt?: number
  name?: string
  deltaThreshold?: number
  windowSeconds?: number
  triggerEvents?: string[]
  lookbackSeconds?: number
  preEventProbCap?: number
  cooldownSeconds?: number | null
  registeredAt?: string
}

export interface DecodedMemo {
  signature: string
  slot: number | null
  blockTime: number | null
  signer: string | null
  memo: Record<string, unknown> | null
  raw: string | null
  verified: boolean
  verificationErrors: string[]
  error?: string
}

function verifyMemo(
  memo: Record<string, unknown> | null,
  expected: ExpectedMemo | undefined,
  signer: string | null,
  transactionFailed: boolean
): string[] {
  const errors: string[] = []
  const expectedSigner = process.env.VEILLE_SOLANA_WALLET_PUBLIC_KEY
  if (transactionFailed) errors.push('transaction execution failed')
  if (!expectedSigner) errors.push('expected signer is not configured')
  else if (signer !== expectedSigner) errors.push('fee payer/signer does not match VEILLE wallet')
  if (!memo) return [...errors, 'memo is missing or is not JSON']
  if (!expected) return [...errors, 'no database record supplied for comparison']

  const exact: Array<[string, unknown]> = [
    ['type', expected.type],
    ['signal_id', expected.signalId],
  ]
  if (expected.strategy !== undefined) exact.push(['strategy', expected.strategy])
  if (expected.matchId !== undefined) exact.push(['match_id', expected.matchId])
  if (expected.triggerEvent !== undefined) exact.push(['trigger', expected.triggerEvent])
  if (expected.favouredTeam !== undefined) exact.push(['favoured', expected.favouredTeam])
  if (expected.firedAt !== undefined) exact.push(['fired_at', expected.firedAt])
  if (expected.outcome !== undefined) exact.push(['outcome', expected.outcome])
  if (expected.resolvedAt !== undefined) exact.push(['resolved_at', expected.resolvedAt])
  if (expected.name !== undefined) exact.push(['name', expected.name])
  if (expected.windowSeconds !== undefined) exact.push(['window_seconds', expected.windowSeconds])
  if (expected.triggerEvents !== undefined) exact.push(['trigger_events', expected.triggerEvents])
  if (expected.lookbackSeconds !== undefined) exact.push(['lookback_seconds', expected.lookbackSeconds])
  if (expected.cooldownSeconds !== undefined) exact.push(['cooldown_seconds', expected.cooldownSeconds])
  if (expected.registeredAt !== undefined) exact.push(['registered_at', expected.registeredAt])
  for (const [key, value] of exact) {
    if (JSON.stringify(memo[key]) !== JSON.stringify(value)) errors.push(`${key} does not match database record`)
  }
  if (expected.delta !== undefined) {
    const actual = Number(memo.delta)
    if (!Number.isFinite(actual) || Math.abs(actual - expected.delta) > 0.000001) {
      errors.push('delta does not match database record')
    }
  }
  const numericDefinitionFields: Array<[string, number | undefined]> = [
    ['delta_threshold', expected.deltaThreshold],
    ['pre_event_prob_cap', expected.preEventProbCap],
  ]
  for (const [key, value] of numericDefinitionFields) {
    if (value === undefined) continue
    const actual = Number(memo[key])
    if (!Number.isFinite(actual) || Math.abs(actual - value) > 0.000001) {
      errors.push(`${key} does not match database record`)
    }
  }
  return errors
}

export async function fetchAndDecodeMemo(signature: string, expected?: ExpectedMemo): Promise<DecodedMemo> {
  try {
    const tx = await getConnection().getTransaction(signature, { maxSupportedTransactionVersion: 0 })
    if (!tx) {
      return {
        signature,
        slot: null,
        blockTime: null,
        signer: null,
        memo: null,
        raw: null,
        verified: false,
        verificationErrors: ['transaction not found'],
        error: 'not found (not yet confirmed?)',
      }
    }

    const keys = tx.transaction.message.staticAccountKeys.map((key) => key.toBase58())
    const signer = keys[0] ?? null
    for (const instruction of tx.transaction.message.compiledInstructions) {
      if (keys[instruction.programIdIndex] !== MEMO_PROGRAM_ID) continue
      const raw = Buffer.from(instruction.data).toString('utf8')
      let memo: Record<string, unknown> | null = null
      try {
        memo = JSON.parse(raw) as Record<string, unknown>
      } catch {
        /* Verification reports malformed memo content below. */
      }
      const verificationErrors = verifyMemo(memo, expected, signer, tx.meta === null || tx.meta.err !== null)
      return {
        signature,
        slot: tx.slot,
        blockTime: tx.blockTime ?? null,
        signer,
        memo,
        raw,
        verified: verificationErrors.length === 0,
        verificationErrors,
      }
    }
    return {
      signature,
      slot: tx.slot,
      blockTime: tx.blockTime ?? null,
      signer,
      memo: null,
      raw: null,
      verified: false,
      verificationErrors: ['no memo instruction in transaction'],
      error: 'no memo instruction in this transaction',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      signature,
      slot: null,
      blockTime: null,
      signer: null,
      memo: null,
      raw: null,
      verified: false,
      verificationErrors: [message],
      error: message,
    }
  }
}

/** Bounded concurrency prevents a dashboard request from flooding the RPC. */
export async function fetchMemosLimited(
  entries: Array<{ signature: string; expected: ExpectedMemo }>,
  concurrency = 5
): Promise<Map<string, DecodedMemo>> {
  const results = new Map<string, DecodedMemo>()
  let cursor = 0
  async function worker(): Promise<void> {
    while (cursor < entries.length) {
      const entry = entries[cursor++]
      results.set(entry.signature, await fetchAndDecodeMemo(entry.signature, entry.expected))
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, () => worker()))
  return results
}
