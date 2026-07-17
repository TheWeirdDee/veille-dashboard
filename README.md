# VEILLE Dashboard

Server-rendered operational dashboard for the VEILLE SCOUT and CLERK agents.

## Local setup

Requires Node.js 22 or newer.

```bash
npm ci
copy .env.local.example .env.local
npm run check
npm run dev
```

The Supabase service-role key, Solana RPC URL, expected wallet public key, Discord webhook URL, and VEILLE webhook secret are server-only variables. Do not prefix them with `NEXT_PUBLIC_`.

## Webhook receiver

Register `/api/notify` as a VEILLE subscriber with the same `VEILLE_WEBHOOK_SECRET`. The receiver:

- authenticates the exact raw v2 body from `X-VEILLE-Signature`;
- checks delivery ID and timestamp headers against the body;
- rejects stale, malformed, oversized, or replayed requests;
- stores delivery receipts in `veille_webhook_receipts`;
- treats Discord non-2xx responses as failures so the agent retries.

Run `supabase/schema.sql` from the agent repository before enabling the route. Without the receipts table the route intentionally returns an error rather than silently accepting an untracked notification.

## Verification boundaries

The on-chain page fetches each Solana transaction and checks the memo fields against the Supabase row and `VEILLE_SOLANA_WALLET_PUBLIC_KEY`. It displays a mismatch when the signer, transaction state, or memo fields differ.

TxLINE proof references are currently unavailable in the agent feed and are stored as null/empty. The dashboard states this explicitly and does not claim native TxLINE proof validation.

Portfolio charts are a `+1` hit / `-1` miss outcome score. They are not trading P&L: entry prices, executable liquidity, fees, and slippage are not modeled.

## Deployment

Deploy to Vercel with every variable from `.env.local.example`. Deploy the Supabase migration before the dashboard and set `VEILLE_SOLANA_WALLET_PUBLIC_KEY` to the public key corresponding to the agents' memo wallet.

CI runs TypeScript and a production Next.js build on Node 22.

`npm audit` reports moderate transitive findings (`postcss` inside Next.js, `uuid` via `jayson`/`@solana/web3.js`). The only offered fixes are breaking downgrades; neither path is reachable from untrusted input in this server-rendered dashboard. Re-evaluate on the next Next.js/web3.js upgrade.
