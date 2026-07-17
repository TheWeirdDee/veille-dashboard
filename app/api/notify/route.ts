/** HMAC-authenticated, replay-protected VEILLE v2 webhook bridge to Discord. */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 64 * 1024
const MAX_CLOCK_SKEW_MS = 15 * 60_000
const STALE_PENDING_MS = 60_000

interface VeillePayload {
  veille_version: number
  delivery_id: string
  sent_at: number
  event: 'signal_fired' | 'position_settled'
  signal_id: string
  strategy: string
  match_id: string
  home_team: string
  away_team: string
  trigger_event: string
  trigger_minute: number
  position: string
  pre_event_prob: number
  post_signal_prob: number
  delta: number
  onchain_tx?: string
  outcome?: string | null
}

function verifySignature(raw: string, signature: string, secret: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false
  const expected = createHmac('sha256', secret).update(raw).digest('hex')
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
}

function isPayload(value: unknown): value is VeillePayload {
  if (!value || typeof value !== 'object') return false
  const p = value as Record<string, unknown>
  return (
    p.veille_version === 2 &&
    typeof p.delivery_id === 'string' &&
    p.delivery_id.length > 0 &&
    p.delivery_id.length <= 512 &&
    typeof p.sent_at === 'number' &&
    (p.event === 'signal_fired' || p.event === 'position_settled') &&
    ['signal_id', 'strategy', 'match_id', 'home_team', 'away_team', 'trigger_event', 'position'].every(
      (key) => typeof p[key] === 'string'
    ) &&
    typeof p.trigger_minute === 'number' &&
    typeof p.pre_event_prob === 'number' &&
    typeof p.post_signal_prob === 'number' &&
    typeof p.delta === 'number'
  )
}

async function claimDelivery(deliveryId: string): Promise<'claimed' | 'duplicate' | 'busy'> {
  const db = getSupabase()
  const inserted = await db.from('veille_webhook_receipts').insert({ delivery_id: deliveryId, status: 'pending' })
  if (!inserted.error) return 'claimed'
  if (inserted.error.code !== '23505') throw new Error(`receipt insert failed: ${inserted.error.message}`)

  const existing = await db
    .from('veille_webhook_receipts')
    .select('status, updated_at')
    .eq('delivery_id', deliveryId)
    .single()
  if (existing.error) throw new Error(`receipt lookup failed: ${existing.error.message}`)
  if (existing.data.status === 'delivered') return 'duplicate'
  const age = Date.now() - new Date(existing.data.updated_at as string).getTime()
  if (existing.data.status === 'pending' && age < STALE_PENDING_MS) return 'busy'

  const reclaimed = await db
    .from('veille_webhook_receipts')
    .update({ status: 'pending', last_error: null, updated_at: new Date().toISOString() })
    .eq('delivery_id', deliveryId)
    .eq('status', existing.data.status as string)
    .select('delivery_id')
    .maybeSingle()
  if (reclaimed.error) throw new Error(`receipt reclaim failed: ${reclaimed.error.message}`)
  return reclaimed.data ? 'claimed' : 'busy'
}

async function markDelivery(deliveryId: string, status: 'delivered' | 'failed', error?: string): Promise<void> {
  const now = new Date().toISOString()
  const result = await getSupabase()
    .from('veille_webhook_receipts')
    .update({
      status,
      last_error: error?.slice(0, 1000) ?? null,
      delivered_at: status === 'delivered' ? now : null,
      updated_at: now,
    })
    .eq('delivery_id', deliveryId)
  if (result.error) throw new Error(`receipt update failed: ${result.error.message}`)
}

function discordMessage(payload: VeillePayload): string {
  const event = payload.event === 'position_settled' ? 'Position settled' : 'Signal fired'
  const lines = [
    `**${event}** — ${payload.home_team} vs ${payload.away_team}`,
    `Strategy ${payload.strategy} · ${payload.position.replaceAll('_', ' ')} · ${payload.trigger_event.replaceAll('_', ' ')} at ${payload.trigger_minute}'`,
    `${(payload.pre_event_prob * 100).toFixed(1)}% → ${(payload.post_signal_prob * 100).toFixed(1)}% (Δ${(payload.delta * 100).toFixed(1)}pp)`,
  ]
  if (payload.outcome) lines.push(`Outcome: **${payload.outcome}**`)
  if (payload.onchain_tx) lines.push(`https://explorer.solana.com/tx/${payload.onchain_tx}`)
  return lines.join('\n').slice(0, 2000)
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.VEILLE_WEBHOOK_SECRET
  const discordUrl = process.env.DISCORD_WEBHOOK_URL
  if (!secret || !discordUrl) return Response.json({ error: 'bridge not configured' }, { status: 503 })

  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_BODY_BYTES) return Response.json({ error: 'payload too large' }, { status: 413 })
  const raw = await request.text()
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return Response.json({ error: 'payload too large' }, { status: 413 })

  const signature = request.headers.get('x-veille-signature') ?? ''
  if (!verifySignature(raw, signature, secret)) return Response.json({ error: 'bad signature' }, { status: 401 })

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 })
  }
  if (!isPayload(payload)) return Response.json({ error: 'invalid payload' }, { status: 422 })

  const deliveryId = request.headers.get('x-veille-delivery-id')
  const sentAt = Number(request.headers.get('x-veille-timestamp'))
  if (deliveryId !== payload.delivery_id || sentAt !== payload.sent_at) {
    return Response.json({ error: 'delivery metadata mismatch' }, { status: 400 })
  }
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > MAX_CLOCK_SKEW_MS) {
    return Response.json({ error: 'stale delivery' }, { status: 401 })
  }

  let claim: 'claimed' | 'duplicate' | 'busy'
  try {
    claim = await claimDelivery(deliveryId)
  } catch (error) {
    console.error('[notify] receipt claim failed', error)
    return Response.json({ error: 'receipt store unavailable' }, { status: 503 })
  }
  if (claim === 'duplicate') return Response.json({ ok: true, duplicate: true })
  if (claim === 'busy') return Response.json({ error: 'delivery already in progress' }, { status: 409 })

  try {
    const discord = await fetch(discordUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: discordMessage(payload) }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!discord.ok) throw new Error(`Discord returned ${discord.status}`)
    await markDelivery(deliveryId, 'delivered')
    return Response.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    try {
      await markDelivery(deliveryId, 'failed', message)
    } catch (receiptError) {
      console.error('[notify] receipt failure update failed', receiptError)
    }
    console.error('[notify] Discord delivery failed', message)
    return Response.json({ error: 'forwarding failed' }, { status: 502 })
  }
}
