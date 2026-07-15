/**
 * Empty tables are a dead end for a first-time visitor: they can't tell
 * "broken" from "selective by design". Every empty state explains why the
 * table is empty and routes to a page where the system's logic is visible.
 */

export function EmptyState({
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  title: string
  body: string
  ctaHref?: string
  ctaLabel?: string
}) {
  return (
    <div
      className="rounded-lg p-8 text-center"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
    >
      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {title}
      </div>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {body}
      </p>
      {ctaHref && ctaLabel && (
        <a
          href={ctaHref}
          className="mt-4 inline-block rounded-full px-4 py-1.5 text-sm font-medium"
          style={{ background: 'var(--series-blue)', color: '#fff' }}
        >
          {ctaLabel}
        </a>
      )}
    </div>
  )
}
