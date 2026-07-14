'use client'

import { usePathname } from 'next/navigation'

const LINKS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Replay', href: '/replay' },
  { label: 'Verify', href: '/verify' },
  { label: 'Signals', href: '/signals' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'On-chain', href: '/onchain' },
  { label: 'Subscribers', href: '/subscribers' },
  { label: 'Agent log', href: '/agent-log' },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-1)' }}>
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-6 text-sm whitespace-nowrap">
        <a
          href="/"
          className="shrink-0 border-b-2 border-transparent py-4 pr-5 font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          VEILLE
        </a>
        {LINKS.map((link) => {
          const active = pathname === link.href
          return (
            <a
              key={link.href}
              href={link.href}
              className="shrink-0 border-b-2 px-3 py-4 transition-colors"
              style={{
                borderColor: active ? 'var(--series-blue)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {link.label}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
