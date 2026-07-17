/** Minimal two-series line chart for cumulative +1/-1 outcome score. */
export function EquityCurve({ a, b }: { a: number[]; b: number[] }) {
  const width = 640
  const height = 160
  const pad = 24
  const maxLen = Math.max(a.length, b.length, 1)
  const allValues = [0, ...a, ...b]
  const yMax = Math.max(...allValues, 1)
  const yMin = Math.min(...allValues, -1)

  const x = (i: number): number => pad + (i / Math.max(maxLen - 1, 1)) * (width - pad * 2)
  const y = (v: number): number => height - pad - ((v - yMin) / (yMax - yMin)) * (height - pad * 2)

  const path = (series: number[]): string =>
    series.length === 0
      ? ''
      : series.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')

  const zeroY = y(0)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Cumulative outcome score, Strategy A vs B">
      <line x1={pad} y1={zeroY} x2={width - pad} y2={zeroY} stroke="var(--gridline)" strokeWidth={1} />
      {a.length > 0 && <path d={path(a)} fill="none" stroke="var(--series-blue)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
      {b.length > 0 && <path d={path(b)} fill="none" stroke="var(--series-violet)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
      {a.length > 0 && <circle cx={x(a.length - 1)} cy={y(a[a.length - 1])} r={4} fill="var(--series-blue)" stroke="var(--surface-1)" strokeWidth={2} />}
      {b.length > 0 && <circle cx={x(b.length - 1)} cy={y(b[b.length - 1])} r={4} fill="var(--series-violet)" stroke="var(--surface-1)" strokeWidth={2} />}
    </svg>
  )
}
