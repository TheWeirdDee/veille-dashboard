export function StatTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </div>
      <div className="tabular mt-1 text-3xl font-semibold" style={{ color: accent ?? 'var(--text-primary)' }}>
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
