'use client'

import { useEffect } from 'react'

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto max-w-xl px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        Dashboard data is temporarily unavailable
      </h1>
      <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
        VEILLE did not substitute an empty or healthy state for a failed data request.
      </p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="mt-6 rounded-full px-4 py-2 text-sm font-medium"
        style={{ background: 'var(--series-blue)', color: '#fff' }}
      >
        Try again
      </button>
    </main>
  )
}
