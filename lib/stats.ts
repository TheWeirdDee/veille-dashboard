/**
 * Statistical rigor for the performance report: Wilson score confidence
 * interval on the hit rate, and an exact two-tailed binomial test against the
 * null hypothesis that the signal is a coin flip (p = 0.5).
 */

export interface HitRateStats {
  hits: number
  total: number
  hitRate: number | null
  ciLower: number | null
  ciUpper: number | null
  /** Two-tailed exact binomial p-value against p0 = 0.5. */
  pValue: number | null
}

/** log(n choose k), computed as a running sum — exact, no gamma-function error. */
function logChoose(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity
  const kk = Math.min(k, n - k)
  let acc = 0
  for (let i = 1; i <= kk; i++) acc += Math.log(n - kk + i) - Math.log(i)
  return acc
}

/** Exact two-tailed binomial test p-value (fair-coin null, p0 = 0.5). */
function binomialTestPValue(hits: number, total: number): number {
  if (total === 0) return 1
  const logHalfN = total * Math.log(0.5)
  const pmf = (k: number): number => Math.exp(logChoose(total, k) + logHalfN)
  const observed = pmf(hits)
  const eps = observed * 1e-7 // float tolerance so the observed term always counts itself
  let p = 0
  for (let k = 0; k <= total; k++) {
    const pk = pmf(k)
    if (pk <= observed + eps) p += pk
  }
  return Math.min(1, p)
}

/** 95% Wilson score interval — well-behaved at small n and near 0/1, unlike the normal approximation. */
function wilsonInterval(hits: number, total: number, z = 1.96): [number, number] {
  const n = total
  const phat = hits / n
  const z2 = z * z
  const denom = 1 + z2 / n
  const center = phat + z2 / (2 * n)
  const margin = z * Math.sqrt((phat * (1 - phat)) / n + z2 / (4 * n * n))
  return [(center - margin) / denom, (center + margin) / denom]
}

export function computeHitRateStats(hits: number, misses: number): HitRateStats {
  const total = hits + misses
  if (total === 0) {
    return { hits, total, hitRate: null, ciLower: null, ciUpper: null, pValue: null }
  }
  const [lower, upper] = wilsonInterval(hits, total)
  return {
    hits,
    total,
    hitRate: hits / total,
    ciLower: lower,
    ciUpper: upper,
    pValue: binomialTestPValue(hits, total),
  }
}

/** Sharpe ratio over a returns series (+1 hit / -1 miss). Tournament-scoped — no annualisation. */
export function calculateSharpe(returns: number[]): number {
  if (returns.length < 2) return 0
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)
  return stdDev === 0 ? 0 : Number((mean / stdDev).toFixed(4))
}

/** Largest peak-to-trough drop in a cumulative P&L series. */
export function calculateMaxDrawdown(pnlSeries: number[]): number {
  let peak = 0
  let maxDD = 0
  for (const pnl of pnlSeries) {
    if (pnl > peak) peak = pnl
    const dd = peak - pnl
    if (dd > maxDD) maxDD = dd
  }
  return Number(maxDD.toFixed(4))
}
