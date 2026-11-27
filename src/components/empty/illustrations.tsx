/*
 * Small decorative SVGs for empty states: purple linework with a single neon accent.
 * aria-hidden because the adjacent heading carries the meaning.
 */

const frame = "h-28 w-36 overflow-visible";

export function WeekIllustration() {
  return (
    <svg viewBox="0 0 144 112" className={frame} aria-hidden>
      <rect
        x="8"
        y="14"
        width="128"
        height="86"
        rx="14"
        className="fill-surface stroke-line-strong"
      />
      <path d="M8 38h128" className="stroke-line-strong" />
      {[0, 1, 2, 3, 4, 5, 6].map((day) => (
        <rect
          key={day}
          x={18 + day * 17}
          y="48"
          width="11"
          height={day === 4 ? 40 : 14 + ((day * 7) % 18)}
          rx="4"
          className={day === 4 ? "fill-neon" : "fill-brand/35"}
        />
      ))}
      <circle cx="26" cy="26" r="4" className="fill-brand" />
      <path d="M38 26h40" strokeWidth="4" strokeLinecap="round" className="stroke-white/15" />
    </svg>
  );
}

export function MonthIllustration() {
  return (
    <svg viewBox="0 0 144 112" className={frame} aria-hidden>
      <rect
        x="8"
        y="10"
        width="128"
        height="94"
        rx="14"
        className="fill-surface stroke-line-strong"
      />
      <path d="M8 34h128" className="stroke-line-strong" />
      {Array.from({ length: 15 }, (_, i) => (
        <rect
          key={i}
          x={20 + (i % 5) * 22}
          y={44 + Math.floor(i / 5) * 19}
          width="16"
          height="12"
          rx="4"
          className={i === 8 ? "fill-neon" : "fill-brand/25"}
        />
      ))}
      <path d="M22 22h28" strokeWidth="4" strokeLinecap="round" className="stroke-white/15" />
    </svg>
  );
}

export function OfflineIllustration() {
  return (
    <svg viewBox="0 0 144 112" className={frame} aria-hidden>
      <path
        d="M14 62h26l8-18 12 36 10-48 8 30h52"
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 10"
        className="stroke-brand/60"
      />
      <circle cx="122" cy="62" r="7" className="fill-neon" />
    </svg>
  );
}
