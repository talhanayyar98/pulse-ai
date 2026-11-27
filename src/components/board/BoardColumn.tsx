"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { TASK_STATUS_LABEL, type TaskStatus } from "@/lib/domain/task-status";

const STATUS_DOT: Record<TaskStatus, string> = {
  backlog: "bg-fg-muted",
  todo: "bg-brand-text",
  in_progress: "bg-brand shadow-[0_0_10px_var(--color-brand-glow)]",
  done: "bg-neon shadow-[0_0_10px_var(--color-neon-glow)]",
};

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
  const { setNodeRef } = useDroppable({ id: `${COLUMN_DROP_PREFIX}${status}` });

  return (
    <section
      aria-label={label}
      className={cn(
        "flex w-[min(20rem,82vw)] shrink-0 snap-start flex-col rounded-2xl border transition-[border-color,box-shadow,background-color] duration-200 xl:w-auto xl:shrink",
        highlighted ? "border-brand/70 bg-brand/8 shadow-glow-brand" : "border-line bg-surface/70",
      )}
    >
      <header className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <span className={cn("size-2 rounded-full", STATUS_DOT[status])} aria-hidden />
        <h2 className="font-display text-sm font-semibold">{label}</h2>
        <span className="ml-auto font-mono text-xs text-fg-muted">{count}</span>
      </header>
      <div ref={setNodeRef} className="flex min-h-48 flex-1 flex-col gap-2 px-3 pb-3">
        <SortableContext id={status} items={taskIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </div>
    </section>
  );
}
