import { cn } from "@/lib/cn";

const PULSE_PATH = "M6 34h12l5-12 8 24 7-32 5 20h15";

/** Brand mark: the app icon's pulse glyph (assets/brand/mark.svg), with a light running along it. */
export function Logo({ className }: Readonly<{ className?: string }>) {
  return (
    <span className={cn("group/logo flex items-center gap-2.5", className)}>
      <span className="grid size-8 place-items-center rounded-[10px] bg-cta shadow-cta transition-transform duration-300 ease-spring group-hover/logo:scale-110 group-hover/logo:-rotate-6">
        <svg viewBox="0 0 64 64" className="size-6 overflow-visible text-on-brand" aria-hidden>
          <path
            d={PULSE_PATH}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.55"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={PULSE_PATH}
            pathLength={100}
            fill="none"
            stroke="currentColor"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="30 200"
            className="animate-heartbeat drop-shadow-[0_0_4px_rgb(255_255_255/0.9)] motion-reduce:hidden"
          />
        </svg>
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">Pulse</span>
    </span>
  );
}
