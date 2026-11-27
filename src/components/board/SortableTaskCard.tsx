"use client";

import { useSortable } from "@dnd-kit/sortable";
import { TaskCard } from "@/components/task/TaskCard";
import type { Task } from "@/lib/domain/task";
import { useUi } from "@/lib/stores/ui";

const SORT_TRANSITION = { duration: 220, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)" };

/**
 * A board card that can be dragged with mouse, touch (long-press) or keyboard (Space).
 * Click or Enter opens the task. Enter is handled on the <li> so dnd-kit's own key
 * listener on the card stays untouched.
 */
export function SortableTaskCard({ task }: Readonly<{ task: Task }>) {
  const openDrawer = useUi((state) => state.openDrawer);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    transition: SORT_TRANSITION,
    attributes: { roleDescription: "draggable task" },
  });

  return (
    <li
      onKeyDown={(event) => {
        if (event.key === "Enter" && !isDragging) {
          event.preventDefault();
          openDrawer(task.id);
        }
      }}
    >
      <div
        ref={setNodeRef}
        style={{
          transform: transform
            ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
            : undefined,
          transition,
        }}
        className="group cursor-grab touch-manipulation rounded-xl active:cursor-grabbing"
        onClick={() => openDrawer(task.id)}
        {...attributes}
        {...listeners}
      >
        <TaskCard task={task} state={isDragging ? "placeholder" : "idle"} />
      </div>
    </li>
  );
}
