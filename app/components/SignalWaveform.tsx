/**
 * Hero visual. Deliberately abstract — no axes, no numbers — so it reads as
 * a concept diagram ("a shock detected mid-stream, then two strategies
 * diverge") rather than a data chart that could be mistaken for real numbers.
 */
export function SignalWaveform() {
  return (
    <svg viewBox="0 0 640 280" className="w-full" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="fadeBlue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--series-blue)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--series-blue)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="fadeViolet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--series-violet)" stopOpacity="0.14" />
          <stop offset="100%" stopColor="var(--series-violet)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* baseline grid */}
      <line x1="20" y1="140" x2="620" y2="140" stroke="var(--gridline)" strokeWidth="1" />

      {/* shared quiet feed before the shock */}
      <path
        d="M20,150 C90,146 160,154 230,150"
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* fills under the diverging lines */}
      <path
        d="M230,150 C280,120 340,60 420,42 C480,30 560,24 620,20 L620,140 L230,150 Z"
        fill="url(#fadeBlue)"
      />
      <path
        d="M230,150 C280,178 340,220 420,236 C480,246 560,252 620,256 L620,140 L230,150 Z"
        fill="url(#fadeViolet)"
      />

      {/* Strategy A — long, diverges up */}
      <path
        d="M230,150 C280,120 340,60 420,42 C480,30 560,24 620,20"
        fill="none"
        stroke="var(--series-blue)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Strategy B — short, diverges down (inverse) */}
      <path
        d="M230,150 C280,178 340,220 420,236 C480,246 560,252 620,256"
        fill="none"
        stroke="var(--series-violet)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* shock marker */}
      <circle cx="230" cy="150" r="5" fill="var(--text-primary)" />
      <circle cx="230" cy="150" r="5" fill="none" stroke="var(--text-primary)" strokeWidth="1.5">
        <animate attributeName="r" values="5;22;5" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="2.6s" repeatCount="indefinite" />
      </circle>

      {/* endpoint markers */}
      <circle cx="620" cy="20" r="4" fill="var(--series-blue)" stroke="var(--surface-1)" strokeWidth="2" />
      <circle cx="620" cy="256" r="4" fill="var(--series-violet)" stroke="var(--surface-1)" strokeWidth="2" />
    </svg>
  )
}
