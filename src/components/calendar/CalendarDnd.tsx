"use client";

import {
  type Announcements,
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  type KeyboardCoordinateGetter,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { motion } from "motion/react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { BodyPortal } from "@/components/ui/BodyPortal";
import type { Task } from "@/lib/domain/task";
import { springs } from "@/lib/motion";
import { TaskChip } from "./TaskChip";

const SCREEN_READER_INSTRUCTIONS = {
  draggable:
    "Press Enter to open this task. To move it to another day, press Space to pick it up, use the arrow keys to choose a day, then press Space again to drop it. Press Escape to cancel.",
};

// The pointer decides while it's there; keyboard drags have none, so use overlap instead.
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

export interface CalendarDndProps {
  /** Every task that can be dragged, by id. */
  tasks: ReadonlyMap<string, Task>;
  /** Drop target ids (days, the unscheduled tray) in the order the arrow keys walk them. */
  targets: readonly string[];
  /** How many targets each arrow key moves a lifted task, keyed by KeyboardEvent.code. */
  steps: Readonly<Partial<Record<string, number>>>;
  /** The target a task sits in now. */
  targetOf: (task: Task) => string;
  /** How a target is read out, e.g. "Monday 7 December". */
  describeTarget: (target: string) => string;
  /** The chip style that follows the pointer. */
  variant: "card" | "line";
  onDrop: (task: Task, target: string) => void;
  children: ReactNode;
}

/**
 * Drag tasks between calendar days by mouse, touch (long-press) or keyboard. Children
 * register drop targets with `useDroppable` and tasks with `useDraggable`, using the ids
 * from `targets` and task ids.
 */
export function CalendarDnd({
  tasks,
  targets,
  steps,
  targetOf,
  describeTarget,
  variant,
  onDrop,
  children,
}: CalendarDndProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // dnd-kit keeps the first sensor and announcement callbacks it gets: read live values here.
  const latest = useRef({ tasks, targets, steps, targetOf, describeTarget });
  useEffect(() => {
    latest.current = { tasks, targets, steps, targetOf, describeTarget };
  });
  const home = useRef<string | null>(null);

  // Arrow keys jump the lifted task to the previous or next target (a day, or a week away).
  const coordinateGetter = useMemo<KeyboardCoordinateGetter>(
    () =>
      (event, { context, currentCoordinates }) => {
        const step = latest.current.steps[event.code];
        if (step === undefined) return undefined;
        event.preventDefault();
        const order = latest.current.targets;
        const from = order.indexOf(String(context.over?.id ?? home.current));
        const to = order[Math.min(Math.max(from + step, 0), order.length - 1)];
        const rect = to === undefined ? undefined : context.droppableRects.get(to);
        const active = context.collisionRect;
        if (!rect || !active) return currentCoordinates;
        return {
          x: rect.left + (rect.width - active.width) / 2,
          y: rect.top + Math.min(16, Math.max(0, (rect.height - active.height) / 2)),
        };
      },
    [],
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press on touch so a swipe still scrolls.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter,
      // Enter opens the task, so only Space picks it up.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  const announcements = useMemo<Announcements>(() => {
    const title = (id: UniqueIdentifier) =>
      `"${latest.current.tasks.get(String(id))?.title ?? "Task"}"`;
    const place = (id: UniqueIdentifier) => latest.current.describeTarget(String(id));
    return {
      onDragStart: ({ active }) => `Picked up ${title(active.id)}.`,
      onDragOver: ({ active, over }) =>
        over ? `${title(active.id)} is over ${place(over.id)}.` : undefined,
      onDragEnd: ({ active, over }) =>
        over
          ? `Moved ${title(active.id)} to ${place(over.id)}.`
          : `${title(active.id)} was not moved.`,
      onDragCancel: ({ active }) => `Move cancelled. ${title(active.id)} is back where it was.`,
    };
  }, []);

  function handleDragStart({ active }: DragStartEvent) {
    const task = tasks.get(String(active.id));
    home.current = task ? targetOf(task) : null;
    setActiveId(String(active.id));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    const task = tasks.get(String(active.id));
    if (!task || !over || String(over.id) === targetOf(task)) return;
    onDrop(task, String(over.id));
  }

  const activeTask = activeId ? tasks.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{ announcements, screenReaderInstructions: SCREEN_READER_INSTRUCTIONS }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {children}
      <BodyPortal>
        {/* No drop animation: the chip re-mounts on its new day with its own entrance. */}
        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <motion.div
              initial={{ scale: 1, rotate: 0 }}
              animate={{ scale: 1.04, rotate: -1.5 }}
              transition={springs.snappy}
            >
              <TaskChip task={activeTask} variant={variant} state="lifted" />
            </motion.div>
          )}
        </DragOverlay>
      </BodyPortal>
    </DndContext>
  );
}
