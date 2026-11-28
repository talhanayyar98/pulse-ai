"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { STATUS_TONE } from "@/components/task/status-tone";
import { cn } from "@/lib/cn";
import { TASK_STATUS_LABEL, type TaskStatus } from "@/lib/domain/task-status";

export const COLUMN_DROP_PREFIX = "column:";

/** A board column: a drop target for its whole height, and a sortable list of cards. */
export function BoardColumn({
  status,
  count,
  taskIds,
  highlighted,
  children,
}: Readonly<{
  status: TaskStatus;
  count: number;
  taskIds: string[];
  /** The column a dragged card is currently over: it glows. */
  highlighted: boolean;
  children: ReactNode;
}>) {
  const label = TASK_STATUS_LABEL[status];
  const tone = STATUS_TONE[status];
  const { setNodeRef } = useDroppable({ id: `${COLUMN_DROP_PREFIX}${status}` });

  return (
    <section
      aria-label={label}
      className={cn(
        "relative flex w-[min(20rem,82vw)] shrink-0 snap-start flex-col rounded-2xl border transition-[border-color,box-shadow,background-color] duration-300 xl:w-auto xl:shrink",
        highlighted
          ? "border-brand/70 bg-brand/10 shadow-glow-brand"
          : "border-line bg-surface/55 hover:border-line-strong",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent to-transparent",
          tone.edge,
        )}
      />
      <header className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <span className="relative flex size-2" aria-hidden>
          {status === "in_progress" && (
            <span className="absolute inset-0 animate-ping-soft rounded-full bg-brand" />
          )}
          <span className={cn("relative size-2 rounded-full", tone.dot)} />
        </span>
        <h2 className="font-display text-sm font-semibold">{label}</h2>
        {/* Re-keyed so the count pops whenever it changes. */}
        <motion.span
          key={count}
          initial={{ scale: 1.35, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 600, damping: 22 }}
          className="ml-auto rounded-full bg-white/6 px-2 py-0.5 font-mono text-xs text-fg-secondary"
        >
          {count}
        </motion.span>
      </header>
      <div ref={setNodeRef} className="flex min-h-48 flex-1 flex-col gap-2 px-3 pb-3">
        <SortableContext id={status} items={taskIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </div>
    </section>
  );
}
