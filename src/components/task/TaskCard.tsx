"use client";

import { ClockIcon, RepeatIcon, SubtasksIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { isDueSoon, isOverdue } from "@/lib/domain/filters";
import type { Priority, Task } from "@/lib/domain/task";
import { formatDue } from "@/lib/due-date";
import { useNow } from "@/lib/hooks/use-now";
import { labelTone } from "@/lib/label-tone";
import { trackSpotlight } from "@/lib/spotlight";
import { PriorityIcon } from "./PriorityIcon";

/**
 * - idle: resting on the board
 * - placeholder: the slot a card leaves behind while it is being dragged
 * - lifted: the copy that follows the pointer (rendered in the drag overlay)
 */
export type TaskCardState = "idle" | "placeholder" | "lifted";

const STATE_CLASS: Record<TaskCardState, string> = {
  // Hover comes from the draggable wrapper (`group`), which also takes the pointer.
  idle: "border-line bg-surface shadow-card group-hover:-translate-y-0.5 group-hover:border-line-strong group-hover:shadow-card-hover",
  placeholder: "border-dashed border-fg/25 bg-surface/50 opacity-50",
  lifted: "cursor-grabbing border-line-strong bg-surface shadow-lift",
};

/** A slim edge on the most pressing cards. */
const PRIORITY_EDGE: Partial<Record<Priority, string>> = {
  high: "bg-warning",
  urgent: "bg-danger",
};

const BADGE = "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium";

/** Purely presentational; SortableTaskCard adds interaction. */
export function TaskCard({
  task,
  state = "idle",
}: Readonly<{ task: Task; state?: TaskCardState }>) {
  const now = useNow();
  const due = formatDue(task, now);
  const subtasksDone = task.subtasks.filter((subtask) => subtask.done).length;
  const overdue = isOverdue(task, now);
  const dueSoon = isDueSoon(task, now);
  const done = task.status === "done";
  const edge = done ? undefined : PRIORITY_EDGE[task.priority];

  return (
    <div
      onPointerMove={state === "idle" ? trackSpotlight : undefined}
      className={cn(
        "spotlight rounded-xl border p-3 text-left transition-[border-color,box-shadow,opacity,translate] duration-200",
        STATE_CLASS[state],
        overdue && state === "idle" && "animate-overdue border-danger/40",
      )}
    >
      {edge && (
        <span
          aria-hidden
          className={cn("absolute top-3 bottom-3 left-0 w-0.75 rounded-r-full", edge)}
        />
      )}
      <div className="flex items-start gap-2">
        <PriorityIcon priority={task.priority} className="mt-0.5" />
        <span
          className={cn(
            "text-[15px] leading-snug font-medium",
            done && "text-fg-secondary line-through decoration-success/60",
          )}
        >
          {task.title}
        </span>
      </div>

      {(task.labels.length > 0 || due || task.subtasks.length > 0) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
          {task.labels.map((label) => (
            <span key={label} className={cn(BADGE, labelTone(label).chip)}>
              {label}
            </span>
          ))}
          {due && (
            <span
              className={cn(
                BADGE,
                "tabular-nums",
                overdue
                  ? "bg-danger/10 text-danger"
                  : dueSoon
                    ? "bg-warning/10 text-warning"
                    : "bg-sunken text-fg-secondary",
              )}
            >
              <ClockIcon className="size-3.5" />
              {overdue && "Overdue · "}
              {due}
            </span>
          )}
          {task.recurrence && <RepeatBadge freq={task.recurrence.freq} />}
          {task.subtasks.length > 0 && (
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1 tabular-nums",
                subtasksDone === task.subtasks.length ? "text-success" : "text-fg-muted",
              )}
            >
              <SubtasksIcon className="size-3.5" />
              {subtasksDone}/{task.subtasks.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** A small loop marking a repeating task; its name says how often. */
export function RepeatBadge({ freq }: Readonly<{ freq: "weekly" | "monthly" }>) {
  const label = freq === "weekly" ? "Repeats weekly" : "Repeats monthly";
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex text-fg-muted">
      <RepeatIcon className="size-3.5" />
    </span>
  );
}
