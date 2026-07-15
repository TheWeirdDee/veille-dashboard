import { getSubscribers } from '@/lib/dashboard-data'
import { EmptyState } from '../components/EmptyState'

export const dynamic = 'force-dynamic'

export default async function SubscribersPage() {
  const subscribers = await getSubscribers()

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Subscribers
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          B2B webhook subscribers. Every fire and settlement is delivered as an HMAC-SHA256-signed POST within the
          retry window. Registration happens via <code className="tabular">veille_subscribers</code> directly —
          this is a monitoring view, not a public sign-up form, since accepting webhook URLs from an unauthenticated
          form would let anyone register an endpoint.
        </p>
      </header>

      {subscribers.length === 0 ? (
        <EmptyState
          title="No webhook subscribers registered yet"
          body="Any service can register an HTTPS endpoint and receive every fire the moment it happens, HMAC-signed so the payload is verifiable. Deliveries, failures, and per-subscriber stats appear here once the first endpoint is registered."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--gridline)' }}>
                {['Name', 'Webhook', 'Strategies', 'Status', 'Deliveries', 'Last delivery'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s, i) => (
                <tr key={s.id} style={i < subscribers.length - 1 ? { borderBottom: '1px solid var(--gridline)' } : undefined}>
                  <td className="px-4 py-2.5" style={{ color: 'var(--text-primary)' }}>
                    {s.name}
                  </td>
                  <td className="tabular px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                    {s.webhookUrl}
                  </td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                    {s.strategies.join(', ')}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: s.active ? 'var(--status-good-bg)' : 'var(--status-muted-bg)',
                        color: s.active ? 'var(--status-good)' : 'var(--text-secondary)',
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.active ? 'var(--status-good)' : 'var(--text-muted)' }} />
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="tabular px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                    {s.totalDeliveries} ok
                    {s.failedDeliveries > 0 && <span style={{ color: 'var(--status-critical)' }}> · {s.failedDeliveries} failed</span>}
                  </td>
                  <td className="tabular px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>
                    {s.lastDeliveryAt ? new Date(s.lastDeliveryAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
