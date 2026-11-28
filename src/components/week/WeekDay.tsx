"use client";

import { useDroppable } from "@dnd-kit/core";
import { format } from "date-fns";
import { EntryItem } from "@/components/calendar/EntryItem";
import { dayTarget } from "@/components/calendar/targets";
import { PlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { type CalendarEntry, dayKey } from "@/lib/domain/calendar";

/** One day of the week planner: a drop target listing that day's tasks. */
export function WeekDay({
  day,
  entries,
  today,
  past,
  onAdd,
}: Readonly<{
  day: Date;
  entries: readonly CalendarEntry[];
  today: boolean;
  past: boolean;
  onAdd: () => void;
}>) {
  const { setNodeRef, isOver } = useDroppable({ id: dayTarget(dayKey(day)) });
  const name = format(day, "EEEE d MMMM");

  return (
    <section
      ref={setNodeRef}
      aria-label={today ? `${name}, today` : name}
      aria-current={today ? "date" : undefined}
      className={cn(
        "group/day relative flex flex-col rounded-2xl border transition-[box-shadow,background-color,border-color] duration-300 xl:min-h-80",
        today ? "border-t-[3px] border-brand/25 border-t-brand shadow-card" : "border-line",
        isOver
          ? "bg-surface ring-2 ring-brand/35"
          : today
            ? "bg-surface/85"
            : past
              ? "bg-sunken/45"
              : "bg-surface/50",
      )}
    >
      <header className="flex items-center gap-2 px-3 pt-2.5 pb-2 xl:items-start xl:pt-3">
        <div className="flex items-baseline gap-2 xl:flex-col xl:gap-0.5">
          <span
            className={cn(
              "text-[11px] font-semibold tracking-[0.12em] uppercase",
              today ? "text-brand-text" : "text-fg-muted",
            )}
          >
            {format(day, "EEE")}
          </span>
          <span
            className={cn(
              "font-display text-3xl leading-none tracking-wide",
              past && !today ? "text-fg-muted" : "text-fg",
            )}
          >
            {format(day, "d")}
          </span>
        </div>
        {today && (
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand-text xl:mt-0.5">
            Today
          </span>
        )}
        <button
          type="button"
          aria-label={`Add a task on ${name}`}
          title="Add a task on this day"
          onClick={onAdd}
          // With a mouse on a wide screen it appears on hover or focus; elsewhere it's always there.
          className="ml-auto grid size-7 place-items-center rounded-lg text-fg-muted transition-[opacity,background-color,color] duration-200 hover:bg-fg/6 hover:text-fg pointer-fine:xl:opacity-0 pointer-fine:xl:group-hover/day:opacity-100 pointer-fine:xl:focus-visible:opacity-100"
        >
          <PlusIcon className="size-4" />
        </button>
      </header>
      {entries.length > 0 ? (
        <ul className="flex flex-col gap-1.5 px-2 pb-2">
          {entries.map((entry) => (
            <EntryItem key={entry.key} entry={entry} variant="card" />
          ))}
        </ul>
      ) : (
        <p className="px-3 pb-3 text-xs text-fg-muted xl:hidden">Nothing planned</p>
      )}
    </section>
  );
}
