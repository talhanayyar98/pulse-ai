"use client";

import { motion } from "motion/react";
import { ClockIcon, SubtasksIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { Task } from "@/lib/domain/task";
import { formatDue } from "@/lib/due-date";
import { useNow } from "@/lib/hooks/use-now";
import { springs } from "@/lib/motion";
import { useUi } from "@/lib/stores/ui";
import { PriorityIcon } from "./PriorityIcon";

export function TaskCard({ task }: Readonly<{ task: Task }>) {
  const openDrawer = useUi((state) => state.openDrawer);
  const now = useNow();
  const due = formatDue(task, now);
  const subtasksDone = task.subtasks.filter((subtask) => subtask.done).length;
  const isDone = task.status === "done";

  return (
    <motion.button
      type="button"
      onClick={() => openDrawer(task.id)}
      whileTap={{ scale: 0.98 }}
      transition={springs.press}
      className="group w-full rounded-xl border border-line bg-surface-raised p-3 text-left shadow-[0_1px_0_rgb(255_255_255/0.04)_inset] transition-[border-color,box-shadow] hover:border-brand/50 hover:shadow-glow-brand"
    >
      <span className="flex items-start gap-2">
        <PriorityIcon priority={task.priority} className="mt-0.5" />
        <span
          className={cn(
            "text-sm leading-snug font-medium",
            isDone && "text-fg-secondary line-through decoration-fg-muted",
          )}
        >
          {task.title}
        </span>
      </span>

      {(task.labels.length > 0 || due || task.subtasks.length > 0) && (
        <span className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
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
        </span>
      )}
    </motion.button>
  );
}
