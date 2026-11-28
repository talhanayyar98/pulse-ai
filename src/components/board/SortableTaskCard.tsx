"use client";

import { useDndContext } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { useState } from "react";
import { TaskCard } from "@/components/task/TaskCard";
import type { Task } from "@/lib/domain/task";
import { useUi } from "@/lib/stores/ui";

const SORT_TRANSITION = { duration: 220, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)" };
/** Entrance stagger per card, capped so long columns don't keep you waiting. */
const STAGGER_MS = 40;
const MAX_STAGGER_STEPS = 8;

/**
 * A board card that can be dragged with mouse, touch (long-press) or keyboard (Space).
 * Click or Enter opens the task. Enter is handled on the <li> so dnd-kit's own key
 * listener on the card stays untouched.
 */
export function SortableTaskCard({ task, index }: Readonly<{ task: Task; index: number }>) {
  const openDrawer = useUi((state) => state.openDrawer);
  const { active } = useDndContext();
  // Cards fade in when they appear (load, filters), but not when they remount mid-drag in
  // another column: a moving entrance would shift the drop targets under the pointer.
  const [entrance] = useState(active === null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    transition: SORT_TRANSITION,
    attributes: { roleDescription: "draggable task" },
  });

  return (
    <li
      className={entrance ? "animate-fade-up" : undefined}
      style={
        entrance
          ? { animationDelay: `${Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS}ms` }
          : undefined
      }
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
