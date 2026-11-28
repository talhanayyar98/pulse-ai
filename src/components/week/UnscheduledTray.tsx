"use client";

import { useDroppable } from "@dnd-kit/core";
import { DraggableTask } from "@/components/calendar/EntryItem";
import { UNSCHEDULED_TARGET } from "@/components/calendar/targets";
import { cn } from "@/lib/cn";
import type { Task } from "@/lib/domain/task";

/** Open tasks without a date, ready to drag onto a day. Dropping a task here clears its date. */
export function UnscheduledTray({ tasks }: Readonly<{ tasks: readonly Task[] }>) {
  const { setNodeRef, isOver } = useDroppable({ id: UNSCHEDULED_TARGET });

  return (
    <section
      ref={setNodeRef}
      aria-label="Unscheduled"
      className={cn(
        "mx-5 mb-4 rounded-2xl border border-dashed px-3 py-2.5 transition-[box-shadow,border-color,background-color] duration-300 md:mx-8",
        isOver ? "border-brand/50 bg-surface ring-2 ring-brand/25" : "border-fg/15 bg-surface/40",
      )}
    >
      <header className="flex items-center gap-2 px-1">
        <h2 className="text-lg leading-none">Unscheduled</h2>
        <span className="min-w-6 rounded-full bg-slate px-2 py-0.5 text-center text-xs font-semibold text-on-brand tabular-nums">
          {tasks.length}
        </span>
        <p className="ml-auto hidden text-xs text-fg-muted sm:block">
          Drag a task onto a day to schedule it. Drop one here to clear its date.
        </p>
      </header>
      {tasks.length > 0 ? (
        <ul className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pt-0.5 pb-1.5 *:w-48 *:shrink-0">
          {tasks.map((task) => (
            <DraggableTask key={task.id} task={task} variant="card" />
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 px-1 text-xs text-fg-muted">Every open task has a day. Look at you.</p>
      )}
    </section>
  );
}
