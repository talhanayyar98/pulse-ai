"use client";

import { ClockIcon, SubtasksIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Task } from "@/lib/domain/task";
import { formatDue } from "@/lib/due-date";
import { useNow } from "@/lib/hooks/use-now";
import { PriorityIcon } from "./PriorityIcon";

/**
 * - idle: resting on the board
 * - placeholder: the slot a card leaves behind while it is being dragged
 * - lifted: the copy that follows the pointer (rendered in the drag overlay)
 */
export type TaskCardState = "idle" | "placeholder" | "lifted";

const STATE_CLASS: Record<TaskCardState, string> = {
  idle: "border-line bg-surface-raised group-hover:border-brand/50 group-hover:shadow-glow-brand",
  placeholder: "border-dashed border-brand/50 bg-brand/5 opacity-40",
  lifted:
    "cursor-grabbing border-neon/80 bg-surface-raised shadow-[0_28px_56px_-16px_rgb(0_0_0/0.85),0_0_28px_-6px_var(--color-neon-glow)]",
};

/** Purely presentational; SortableTaskCard adds interaction. */
export function TaskCard({
  task,
  state = "idle",
}: Readonly<{ task: Task; state?: TaskCardState }>) {
  const now = useNow();
  const due = formatDue(task, now);
  const subtasksDone = task.subtasks.filter((subtask) => subtask.done).length;

  return (
    <div
      className={cn(
        "rounded-xl border p-3 text-left shadow-[0_1px_0_rgb(255_255_255/0.04)_inset] transition-[border-color,box-shadow,opacity]",
        STATE_CLASS[state],
      )}
    >
      <div className="flex items-start gap-2">
        <PriorityIcon priority={task.priority} className="mt-0.5" />
        <span
          className={cn(
            "text-sm leading-snug font-medium",
            task.status === "done" && "text-fg-secondary line-through decoration-fg-muted",
          )}
        >
          {task.title}
        </span>
      </div>

      {(task.labels.length > 0 || due || task.subtasks.length > 0) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
          {task.labels.map((label) => (
            <span key={label} className="rounded-md bg-brand/15 px-1.5 py-0.5 text-brand-text">
              {label}
            </span>
          ))}
          {due && (
            <span className="inline-flex items-center gap-1 font-mono text-fg-secondary">
              <ClockIcon className="size-3.5" />
              {due}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1 font-mono",
                subtasksDone === task.subtasks.length ? "text-neon" : "text-fg-secondary",
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
