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
  /** The column a dragged card is currently over: it gets a ring in its own hue. */
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
        "relative flex w-[min(20rem,82vw)] shrink-0 snap-start flex-col rounded-2xl border border-t-[3px] transition-[box-shadow] duration-300 xl:w-auto xl:shrink",
        tone.soft,
        tone.border,
        highlighted && cn("ring-2", tone.ring),
      )}
    >
      <header className="flex items-center gap-2.5 px-4 pt-3.5 pb-3">
        <span className="relative flex size-2" aria-hidden>
          {status === "in_progress" && (
            <span className={cn("absolute inset-0 animate-ping-soft rounded-full", tone.dot)} />
          )}
          <span className={cn("relative size-2 rounded-full", tone.dot)} />
        </span>
        <h2 className="text-base font-semibold text-fg">{label}</h2>
        {/* Re-keyed so the count pops whenever it changes. */}
        <motion.span
          key={count}
          initial={{ scale: 1.35, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 600, damping: 22 }}
          className={cn(
            "ml-auto min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums",
            tone.count,
          )}
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
