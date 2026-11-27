"use client";

import { ClockIcon, SubtasksIcon } from "@/components/ui/icons";
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
  idle: "border-line bg-surface-raised/90 group-hover:-translate-y-0.5 group-hover:border-brand/50 group-hover:shadow-[0_16px_32px_-14px_rgb(0_0_0/0.75),0_0_26px_-8px_var(--color-brand-glow)]",
  placeholder: "border-dashed border-brand/50 bg-brand/5 opacity-40",
  lifted:
    "cursor-grabbing border-accent/70 bg-surface-raised shadow-[0_28px_56px_-16px_rgb(0_0_0/0.85),0_0_32px_-6px_var(--color-accent-glow)]",
};

/** A slim edge on the most pressing cards. */
const PRIORITY_EDGE: Partial<Record<Priority, string>> = {
  high: "bg-accent/80",
  urgent: "bg-danger shadow-[0_0_10px_var(--color-danger-glow)]",
};

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
        "spotlight rounded-xl border p-3 text-left shadow-[0_1px_0_rgb(255_255_255/0.05)_inset] transition-[border-color,box-shadow,opacity,translate] duration-200",
        STATE_CLASS[state],
        overdue && state === "idle" && "animate-overdue border-danger/60",
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
            "text-sm leading-snug font-medium",
            done && "text-fg-secondary line-through decoration-success/70",
          )}
        >
          {task.title}
        </span>
      </div>

      {(task.labels.length > 0 || due || task.subtasks.length > 0) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
          {task.labels.map((label) => (
            <span key={label} className={cn("rounded-md px-1.5 py-0.5", labelTone(label).chip)}>
              {label}
            </span>
          ))}
          {due && (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-mono",
                overdue ? "text-danger" : dueSoon ? "text-warning" : "text-fg-secondary",
              )}
            >
              <ClockIcon className="size-3.5" />
              {overdue && "Overdue · "}
              {due}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1 font-mono",
                subtasksDone === task.subtasks.length ? "text-success" : "text-fg-secondary",
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
