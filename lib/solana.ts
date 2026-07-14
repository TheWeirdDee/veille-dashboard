/**
 * Fetches VEILLE's own on-chain memo transactions and decodes them —
 * "decoded and displayed" per the product spec, not just a link out to
 * Explorer. The Explorer link stays too, since that's the independent
 * verification path a trading desk would actually use.
 */

import { Connection } from '@solana/web3.js'

const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'

let connection: Connection | null = null
function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com', 'confirmed')
  }
  return connection
}

export interface DecodedMemo {
  signature: string
  slot: number | null
  blockTime: number | null
  memo: Record<string, unknown> | null
  raw: string | null
  error?: string
}

export async function fetchAndDecodeMemo(signature: string): Promise<DecodedMemo> {
  try {
    const tx = await getConnection().getTransaction(signature, { maxSupportedTransactionVersion: 0 })
    if (!tx) return { signature, slot: null, blockTime: null, memo: null, raw: null, error: 'not found (not yet confirmed?)' }

    const keys = tx.transaction.message.staticAccountKeys.map((k) => k.toBase58())
    for (const ix of tx.transaction.message.compiledInstructions) {
      if (keys[ix.programIdIndex] !== MEMO_PROGRAM_ID) continue
      const raw = Buffer.from(ix.data).toString('utf-8')
      let memo: Record<string, unknown> | null = null
      try {
        memo = JSON.parse(raw) as Record<string, unknown>
      } catch {
        /* raw string still shown even if not valid JSON */
      }
      return { signature, slot: tx.slot, blockTime: tx.blockTime ?? null, memo, raw }
    }
    return { signature, slot: tx.slot, blockTime: tx.blockTime ?? null, memo: null, raw: null, error: 'no memo instruction in this transaction' }
  } catch (err) {
    return { signature, slot: null, blockTime: null, memo: null, raw: null, error: err instanceof Error ? err.message : String(err) }
  }
}

/** Bounded concurrency so a page with many rows doesn't hammer the public RPC. */
export async function fetchMemosLimited(signatures: string[], concurrency = 5): Promise<Map<string, DecodedMemo>> {
  const results = new Map<string, DecodedMemo>()
  let cursor = 0
  async function worker(): Promise<void> {
    while (cursor < signatures.length) {
      const sig = signatures[cursor++]
      results.set(sig, await fetchAndDecodeMemo(sig))
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, signatures.length) }, () => worker()))
  return results
}
