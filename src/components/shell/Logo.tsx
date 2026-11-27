import { cn } from "@/lib/cn";

/** Brand mark: same pulse glyph as the app icon (assets/brand/mark.svg). */
export function Logo({ className }: Readonly<{ className?: string }>) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-8 place-items-center rounded-[10px] bg-linear-135 from-brand-strong to-brand-deep shadow-glow-brand">
        <svg viewBox="0 0 64 64" className="size-6 text-neon" aria-hidden>
          <path
            d="M6 34h12l5-12 8 24 7-32 5 20h15"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">Pulse</span>
    </span>
  );
}
