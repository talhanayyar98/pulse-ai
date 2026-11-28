"use client";

import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/cn";
import type { CalendarEntry } from "@/lib/domain/calendar";
import type { Task } from "@/lib/domain/task";
import { formatOccurrence } from "@/lib/recurrence-label";
import { useUi } from "@/lib/stores/ui";
import { TaskChip } from "./TaskChip";

/** Matches calendar items, so a click on a day's empty space can tell them apart. */
export const CALENDAR_ITEM_SELECTOR = "[data-calendar-item]";

/** A calendar entry: a draggable task, or a projected occurrence that opens its series. */
export function EntryItem({
  entry,
  variant,
}: Readonly<{ entry: CalendarEntry; variant: "card" | "line" }>) {
  return entry.kind === "task" ? (
    <DraggableTask task={entry.task} variant={variant} />
  ) : (
    <ProjectedOccurrence entry={entry} variant={variant} />
  );
}

/**
 * Click or Enter opens the task; drag it (Space to lift on the keyboard) to another day.
 * Enter is handled on the <li> so dnd-kit's own key listener on the chip stays untouched.
 */
export function DraggableTask({
  task,
  variant,
}: Readonly<{ task: Task; variant: "card" | "line" }>) {
  const openDrawer = useUi((state) => state.openDrawer);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    attributes: { roleDescription: "draggable task" },
  });

  return (
    <li
      className="animate-fade-up"
      onKeyDown={(event) => {
        if (event.key === "Enter" && !isDragging) {
          event.preventDefault();
          openDrawer(task.id);
        }
      }}
    >
      <div
        ref={setNodeRef}
        data-calendar-item
        className={cn(
          "group cursor-grab touch-manipulation active:cursor-grabbing",
          variant === "card" ? "rounded-xl" : "rounded-md",
        )}
        onClick={() => openDrawer(task.id)}
        {...attributes}
        {...listeners}
      >
        <TaskChip task={task} variant={variant} state={isDragging ? "placeholder" : "idle"} />
      </div>
    </li>
  );
}

function ProjectedOccurrence({
  entry,
  variant,
}: Readonly<{ entry: CalendarEntry; variant: "card" | "line" }>) {
  const openDrawer = useUi((state) => state.openDrawer);
  const when = formatOccurrence(entry.at, entry.task.allDay);
  return (
    <li className="animate-fade-up">
      <button
        type="button"
        data-calendar-item
        aria-label={`Upcoming: ${entry.task.title}, ${when}. Opens the current one.`}
        title="Upcoming repeat. Opens the current one."
        onClick={() => openDrawer(entry.task.id)}
        className={cn(
          "group block w-full text-left",
          variant === "card" ? "rounded-xl" : "rounded-md",
        )}
      >
        <TaskChip task={entry.task} variant={variant} state="projected" at={entry.at} />
      </button>
    </li>
  );
}
