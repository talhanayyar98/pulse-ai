"use client";

import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

/** Previous / Today / Next, and the range on screen. */
export function CalendarToolbar({
  label,
  unit,
  onStep,
  onToday,
  note,
}: Readonly<{
  label: string;
  unit: "week" | "month";
  onStep: (direction: -1 | 1) => void;
  onToday: () => void;
  /** A short line after the range, e.g. how many tasks are in it. */
  note?: string;
}>) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 pb-4 md:px-8">
      <div className="flex items-center gap-0.5 rounded-xl border border-line bg-surface p-0.5 shadow-card">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Previous ${unit}`}
          onClick={() => onStep(-1)}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onToday}>
          Today
        </Button>
        <Button variant="ghost" size="icon" aria-label={`Next ${unit}`} onClick={() => onStep(1)}>
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
      <h2 aria-live="polite" className="text-2xl leading-none text-fg">
        {label}
      </h2>
      {note && <p className="text-xs text-fg-muted">{note}</p>}
    </div>
  );
}
