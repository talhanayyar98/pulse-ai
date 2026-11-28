"use client";

import { format } from "date-fns";
import { PriorityIcon } from "@/components/task/PriorityIcon";
import { STATUS_TONE } from "@/components/task/status-tone";
import { RepeatIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { isOverdue } from "@/lib/domain/filters";
import type { Task } from "@/lib/domain/task";
import { useNow } from "@/lib/hooks/use-now";

/**
 * - idle: resting on a day
 * - placeholder: the spot a chip leaves while it is dragged
 * - lifted: the copy following the pointer (drag overlay)
 * - projected: an upcoming occurrence of a repeating task, not a real task yet
 */
export type ChipState = "idle" | "placeholder" | "lifted" | "projected";

const STATE_CLASS: Record<ChipState, string> = {
  // Hover comes from the draggable wrapper (`group`).
  idle: "border-line bg-surface shadow-card group-hover:-translate-y-px group-hover:border-line-strong group-hover:shadow-card-hover",
  placeholder: "border-dashed border-fg/25 bg-surface/50 opacity-45",
  lifted: "cursor-grabbing border-line-strong bg-surface shadow-lift",
  projected:
    "border-dashed border-fg/20 bg-surface/40 text-fg-secondary group-hover:border-fg/35 group-hover:bg-surface/70",
};

/** Idle, but late: a rose border instead of the paper one. */
const OVERDUE_CLASS =
  "border-danger/40 bg-surface shadow-card group-hover:-translate-y-px group-hover:border-danger/60 group-hover:shadow-card-hover";

/**
 * A task on the week planner ("card": up to two lines of title) or the month calendar
 * ("line": one line). `at` overrides the time shown, for projected occurrences.
 */
export function TaskChip({
  task,
  variant,
  state = "idle",
  at,
}: Readonly<{ task: Task; variant: "card" | "line"; state?: ChipState; at?: Date }>) {
  const now = useNow();
  const projected = state === "projected";
  const done = task.status === "done";
  const overdue = !projected && isOverdue(task, now);
  const due = at ?? (task.dueAt ? new Date(task.dueAt) : null);
  const time = due && !task.allDay ? format(due, "HH:mm") : null;
  const look = overdue && state === "idle" ? OVERDUE_CLASS : STATE_CLASS[state];

  const title = (
    <span
      className={cn(
        "font-medium",
        variant === "card" ? "line-clamp-2 text-[13px] leading-snug" : "min-w-0 flex-1 truncate",
        done && "text-fg-secondary line-through decoration-success/60",
      )}
    >
      {done && <span className="sr-only">Done: </span>}
      {task.title}
    </span>
  );
  const dot = (
    <span
      aria-hidden
      className={cn("size-1.5 shrink-0 rounded-full", STATUS_TONE[task.status].dot)}
    />
  );
  const clock = time && (
    <span className={cn("font-mono tabular-nums", overdue ? "text-danger" : "text-fg-muted")}>
      {time}
    </span>
  );
  const repeat = task.recurrence && (
    <RepeatIcon aria-hidden className="size-3 shrink-0 text-fg-muted" />
  );

  if (variant === "line") {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs transition-[border-color,box-shadow,opacity,translate,background-color] duration-200",
          look,
        )}
      >
        {dot}
        {clock}
        {title}
        {repeat}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border px-2.5 py-2 transition-[border-color,box-shadow,opacity,translate,background-color] duration-200",
        look,
        overdue && state === "idle" && "animate-overdue",
      )}
    >
      <div className="mb-1 flex items-center gap-1.5 text-[11px]">
        {dot}
        {clock}
        {overdue && <span className="font-medium text-danger">Overdue</span>}
        {repeat}
        <PriorityIcon priority={task.priority} className="ml-auto size-3.5" />
      </div>
      {title}
    </div>
  );
}
