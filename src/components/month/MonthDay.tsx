"use client";

import { useDroppable } from "@dnd-kit/core";
import { format } from "date-fns";
import { EntryItem } from "@/components/calendar/EntryItem";
import { dayTarget } from "@/components/calendar/targets";
import { STATUS_TONE } from "@/components/task/status-tone";
import { PlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { type CalendarEntry, dayKey } from "@/lib/domain/calendar";

/** Chips a day shows before folding the rest into "+N more" (wide screens). */
const MAX_CHIPS = 3;
/** Dots a day shows in the compact grid (narrow screens). */
const MAX_DOTS = 3;

/**
 * One day of the month grid, and a drop target. Wide screens list its tasks as chips and
 * quick-add on a click in its empty space; narrow screens show dots and select the day.
 */
export function MonthDay({
  day,
  entries,
  inMonth,
  today,
  selected,
  onAdd,
  onSelect,
  onShowAll,
}: Readonly<{
  day: Date;
  entries: readonly CalendarEntry[];
  inMonth: boolean;
  today: boolean;
  selected: boolean;
  onAdd: () => void;
  onSelect: () => void;
  onShowAll: () => void;
}>) {
  const { setNodeRef, isOver } = useDroppable({ id: dayTarget(dayKey(day)) });
  const name = format(day, "EEEE d MMMM");
  const visible = entries.length > MAX_CHIPS ? entries.slice(0, MAX_CHIPS - 1) : entries;
  const hidden = entries.length - visible.length;
  const count = entries.length === 1 ? "1 item" : `${entries.length} items`;

  return (
    <div
      ref={setNodeRef}
      role="group"
      aria-label={today ? `${name}, today` : name}
      className={cn(
        "group/day relative flex min-h-14 flex-col border-r border-b border-line p-1 transition-[background-color,box-shadow] duration-200 lg:min-h-32 lg:p-1.5",
        isOver
          ? "bg-surface shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--color-brand)_45%,transparent)]"
          : selected
            ? "bg-surface/60 max-lg:bg-brand/8"
            : inMonth
              ? "bg-surface/60"
              : "bg-sunken/50",
      )}
    >
      {/* Wide screens: the whole day is an "add" target; chips sit above it. */}
      <button
        type="button"
        aria-label={`Add a task on ${name}`}
        onClick={onAdd}
        className="absolute inset-0 hidden -outline-offset-2 lg:block"
      />
      {/* Narrow screens: tapping a day shows its tasks below the grid. */}
      {inMonth && (
        <button
          type="button"
          aria-label={`${name}, ${count}`}
          aria-pressed={selected}
          onClick={onSelect}
          className="absolute inset-0 -outline-offset-2 lg:hidden"
        />
      )}

      <div className="pointer-events-none relative flex items-center justify-between">
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full font-display text-base leading-none tracking-wide lg:size-7 lg:text-lg",
            today ? "bg-brand text-on-brand" : inMonth ? "text-fg" : "text-fg-muted",
          )}
        >
          {format(day, "d")}
        </span>
        <PlusIcon
          aria-hidden
          className="hidden size-3.5 text-fg-muted opacity-0 transition-opacity duration-200 group-hover/day:opacity-100 lg:block"
        />
      </div>

      <ul className="pointer-events-none relative mt-1 hidden flex-col gap-0.5 *:pointer-events-auto lg:flex">
        {visible.map((entry) => (
          <EntryItem key={entry.key} entry={entry} variant="line" />
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={onShowAll}
          aria-label={`Show all ${entries.length} on ${name} in the week planner`}
          className="relative mt-0.5 hidden self-start rounded-md px-1.5 text-[11px] font-medium text-fg-secondary hover:bg-fg/6 hover:text-fg lg:block"
        >
          +{hidden} more
        </button>
      )}

      {entries.length > 0 && (
        <span
          aria-hidden
          className="pointer-events-none relative mt-auto flex items-center gap-0.5 pb-0.5 lg:hidden"
        >
          {entries.slice(0, MAX_DOTS).map((entry) => (
            <span
              key={entry.key}
              className={cn(
                "size-1.5 rounded-full",
                entry.kind === "projected"
                  ? "ring-1 ring-fg-muted ring-inset"
                  : STATUS_TONE[entry.task.status].dot,
              )}
            />
          ))}
          {entries.length > MAX_DOTS && (
            <span className="text-[9px] leading-none font-semibold text-fg-muted">
              +{entries.length - MAX_DOTS}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
