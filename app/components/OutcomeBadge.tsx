const CONFIG: Record<string, { label: string; dot: string; bg: string; fg: string }> = {
  hit: { label: 'Hit', dot: 'var(--status-good)', bg: 'var(--status-good-bg)', fg: 'var(--status-good)' },
  miss: { label: 'Miss', dot: 'var(--status-critical)', bg: 'var(--status-critical-bg)', fg: 'var(--status-critical)' },
  void: { label: 'Void', dot: 'var(--text-muted)', bg: 'var(--status-muted-bg)', fg: 'var(--text-secondary)' },
  pending: { label: 'Pending', dot: 'var(--text-muted)', bg: 'var(--status-muted-bg)', fg: 'var(--text-secondary)' },
  open: { label: 'Open', dot: 'var(--series-blue)', bg: 'var(--status-muted-bg)', fg: 'var(--text-secondary)' },
  confirmed: { label: 'Confirmed', dot: 'var(--status-good)', bg: 'var(--status-good-bg)', fg: 'var(--status-good)' },
  failed: { label: 'Failed', dot: 'var(--status-critical)', bg: 'var(--status-critical-bg)', fg: 'var(--status-critical)' },
}

export function OutcomeBadge({ value }: { value: string | null }) {
  const cfg = CONFIG[value ?? 'pending'] ?? CONFIG.pending
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}
