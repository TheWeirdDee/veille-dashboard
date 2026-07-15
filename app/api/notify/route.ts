/**
 * Webhook bridge: VEILLE subscriber endpoint → Discord.
 *
 * Register this route as a VEILLE subscriber (veille/scripts/add-subscriber.ts)
 * and every signal fire / settlement becomes a Discord message. Verifies the
 * HMAC-SHA256 signature before doing anything, so only the real agent can
 * post through it.
 *
 * Env:
 *   VEILLE_WEBHOOK_SECRET — must equal the subscriber row's secret_key
 *   DISCORD_WEBHOOK_URL   — optional; without it the delivery is accepted
 *                           (200, counts as delivered) but not forwarded.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.VEILLE_WEBHOOK_SECRET
  if (!secret) return new Response('bridge not configured', { status: 503 })

  let payload: Record<string, unknown>
  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    return new Response('invalid json', { status: 400 })
  }

  const { hmac_signature: signature, ...base } = payload
  if (typeof signature !== 'string') return new Response('missing signature', { status: 401 })
  const expected = createHmac('sha256', secret).update(JSON.stringify(base)).digest('hex')
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(signature, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response('bad signature', { status: 401 })
  }

  const discordUrl = process.env.DISCORD_WEBHOOK_URL
  if (discordUrl) {
    const event = payload.event === 'position_settled' ? 'Position settled' : 'Signal fired'
    const pre = Number(payload.pre_event_prob ?? 0)
    const post = Number(payload.post_signal_prob ?? 0)
    const lines = [
      `**${event}** — ${String(payload.home_team)} vs ${String(payload.away_team)}`,
      `Strategy ${String(payload.strategy)} · ${String(payload.position).replace('_', ' ')} · ${String(payload.trigger_event)} at ${String(payload.trigger_minute)}'`,
      `${(pre * 100).toFixed(1)}% → ${(post * 100).toFixed(1)}% (Δ${(Number(payload.delta ?? 0) * 100).toFixed(1)}pp)`,
    ]
    if (payload.outcome) lines.push(`Outcome: **${String(payload.outcome)}**`)
    if (payload.onchain_tx) lines.push(`https://explorer.solana.com/tx/${String(payload.onchain_tx)}`)
    try {
      await fetch(discordUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: lines.join('\n') }),
        signal: AbortSignal.timeout(8000),
      })
    } catch {
      // Forwarding is best-effort; the delivery to VEILLE still succeeded.
    }
  }

  return new Response('ok', { status: 200 })
}
