import { getAgentLog } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

const SEVERITY_COLOR: Record<string, string> = {
  info: 'var(--text-muted)',
  warning: 'var(--status-warning)',
  critical: 'var(--status-critical)',
}

export default async function AgentLogPage() {
  const entries = await getAgentLog(100)

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Agent log
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Reconnects, JWT renewals, snapshot recoveries, voided matches, on-chain and subscriber failures — every
          resilience event either agent handled without a human. This is the proof the system ran autonomously.
        </p>
      </header>

      {entries.length === 0 ? (
        <div
          className="rounded-lg p-6 text-center text-sm"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          No log entries yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--gridline)' }}>
                {['Agent', 'Event', 'Details', 'Severity', 'Logged'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id} style={i < entries.length - 1 ? { borderBottom: '1px solid var(--gridline)' } : undefined}>
                  <td className="px-4 py-2.5 uppercase" style={{ color: 'var(--text-primary)' }}>
                    {e.agent}
                  </td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                    {e.eventType.replace(/_/g, ' ')}
                  </td>
                  <td className="tabular px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {e.details ? JSON.stringify(e.details) : '—'}
                  </td>
                  <td className="px-4 py-2.5 font-medium" style={{ color: SEVERITY_COLOR[e.severity] }}>
                    {e.severity}
                  </td>
                  <td className="tabular px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>
                    {new Date(e.loggedAt).toLocaleString()}
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
