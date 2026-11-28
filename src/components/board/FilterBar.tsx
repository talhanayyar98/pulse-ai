"use client";

import type { ReactNode } from "react";
import { PriorityIcon } from "@/components/task/PriorityIcon";
import { Button } from "@/components/ui/Button";
import { XIcon } from "@/components/ui/icons";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { hasActiveFilters, HORIZON_FILTERS, type HorizonFilter } from "@/lib/domain/filters";
import { PRIORITIES, PRIORITY_LABEL } from "@/lib/domain/task";
import { labelTone } from "@/lib/label-tone";
import { useBoardFilters } from "@/lib/stores/board-filters";

const HORIZON_LABEL: Record<HorizonFilter, string> = {
  all: "All",
  week: "This week",
  month: "This month",
};
const HORIZON_OPTIONS = HORIZON_FILTERS.map((value) => ({ value, label: HORIZON_LABEL[value] }));

export function FilterBar({
  labels,
  visibleCount,
  totalCount,
}: Readonly<{ labels: string[]; visibleCount: number; totalCount: number }>) {
  const filters = useBoardFilters((state) => state.filters);
  const { setHorizon, togglePriority, toggleLabel, clear } = useBoardFilters.getState();
  const active = hasActiveFilters(filters);
  const selectedLabel = (label: string) =>
    filters.labels.some((selected) => selected.toLowerCase() === label.toLowerCase());
  // Keep selected labels visible even if no task uses them any more, so they can be cleared.
  const labelChips = [
    ...labels,
    ...filters.labels.filter(
      (label) => !labels.some((l) => l.toLowerCase() === label.toLowerCase()),
    ),
  ];

  return (
    <div
      role="group"
      aria-label="Filter tasks"
      // One sideways-scrolling row on phones so the board stays in view; wraps on wider screens.
      className="flex [scrollbar-width:none] items-center gap-x-4 gap-y-2 overflow-x-auto px-5 pb-5 md:flex-wrap md:overflow-visible md:px-8 [&>*]:shrink-0"
    >
      <Segmented
        label="Planning horizon"
        value={filters.horizon}
        options={HORIZON_OPTIONS}
        onChange={setHorizon}
      />

      <ChipGroup label="Priority">
        {PRIORITIES.map((priority) => (
          <Chip
            key={priority}
            pressed={filters.priorities.includes(priority)}
            onClick={() => togglePriority(priority)}
          >
            <PriorityIcon priority={priority} className="size-3.5" />
            {PRIORITY_LABEL[priority]}
          </Chip>
        ))}
      </ChipGroup>

      {labelChips.length > 0 && (
        <ChipGroup label="Labels">
          {labelChips.map((label) => (
            <Chip key={label} pressed={selectedLabel(label)} onClick={() => toggleLabel(label)}>
              <span className={labelTone(label).text}>#</span>
              {label}
            </Chip>
          ))}
        </ChipGroup>
      )}

      {active && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-secondary tabular-nums">
            {visibleCount} of {totalCount}
          </span>
          <Button variant="ghost" size="sm" className="group" onClick={clear}>
            <XIcon className="size-3.5 transition-transform duration-300 ease-spring group-hover:rotate-90" />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}

function ChipGroup({
  label,
  className,
  children,
}: Readonly<{ label: string; className?: string; children: ReactNode }>) {
  return (
    <div role="group" aria-label={label} className={cn("flex items-center gap-1.5", className)}>
      {children}
    </div>
  );
}

function Chip({
  pressed,
  onClick,
  children,
}: Readonly<{ pressed: boolean; onClick: () => void; children: ReactNode }>) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition-[color,background-color,border-color,box-shadow,translate,scale] duration-200 active:scale-95",
        pressed
          ? "border-brand/45 bg-brand/10 text-brand-text"
          : "border-line bg-surface text-fg-secondary hover:-translate-y-px hover:border-line-strong hover:text-fg hover:shadow-card",
      )}
    >
      {children}
    </button>
  );
}
