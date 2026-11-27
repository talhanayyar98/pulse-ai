"use client";

import {
  type Announcements,
  type CollisionDetection,
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  type DropAnimation,
  defaultDropAnimationSideEffects,
  getFirstCollision,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TaskCard } from "@/components/task/TaskCard";
import { orderAtIndex, type Task } from "@/lib/domain/task";
import { TASK_STATUS_LABEL, TASK_STATUSES, type TaskStatus } from "@/lib/domain/task-status";
import { useIsClient } from "@/lib/hooks/use-is-client";
import { springs } from "@/lib/motion";
import { BoardColumn, COLUMN_DROP_PREFIX } from "./BoardColumn";
import { SortableTaskCard } from "./SortableTaskCard";

type ColumnIds = Record<TaskStatus, string[]>;

interface DragState {
  activeId: string;
  /** Card ids per column, including the dragged card's live position. */
  columns: ColumnIds;
  overColumn: TaskStatus | null;
}

function toColumnIds(columns: Record<TaskStatus, Task[]>): ColumnIds {
  return Object.fromEntries(
    TASK_STATUSES.map((status) => [status, columns[status].map((task) => task.id)]),
  ) as ColumnIds;
}

function columnFromDropId(id: UniqueIdentifier): TaskStatus | null {
  const raw = String(id);
  if (!raw.startsWith(COLUMN_DROP_PREFIX)) return null;
  return TASK_STATUSES.find((status) => `${COLUMN_DROP_PREFIX}${status}` === raw) ?? null;
}

/** The column a card or column drop target belongs to. */
function columnOf(columns: ColumnIds, id: UniqueIdentifier): TaskStatus | null {
  return (
    columnFromDropId(id) ??
    TASK_STATUSES.find((status) => columns[status].includes(String(id))) ??
    null
  );
}

const SCREEN_READER_INSTRUCTIONS = {
  draggable:
    "Press Enter to open this task. To move it, press Space to pick it up, use the arrow keys to move it within or between columns, then press Space again to drop it. Press Escape to cancel.",
};

export interface BoardDndProps {
  /** Visible tasks per column, in display order. */
  columns: Record<TaskStatus, Task[]>;
  /** Shown in place of cards while tasks load. */
  loading: boolean;
  /** Persist a move: the card's new column and order key. */
  onMove: (taskId: string, status: TaskStatus, order: string) => void;
  /** Content for an empty column. */
  renderEmpty: (status: TaskStatus) => ReactNode;
  /** Extra content under a column's cards (e.g. collapsed Done tasks). */
  renderFooter?: (status: TaskStatus) => ReactNode;
}

export function BoardDnd({ columns, loading, onMove, renderEmpty, renderFooter }: BoardDndProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const reduceMotion = useReducedMotion();

  const tasksById = useMemo(
    () =>
      new Map(TASK_STATUSES.flatMap((status) => columns[status]).map((task) => [task.id, task])),
    [columns],
  );
  const baseIds = useMemo(() => toColumnIds(columns), [columns]);
  const columnIds = drag?.columns ?? baseIds;

  // Latest values for dnd-kit callbacks, which are not re-bound on every render.
  const latest = useRef({ columnIds, tasksById });
  useEffect(() => {
    latest.current = { columnIds, tasksById };
  });

  // Moving a card into another column re-measures everything; for one frame the collision
  // can flip back to the old column and oscillate. Pin the last target until layout settles.
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const movedColumn = useRef(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      movedColumn.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [drag?.columns]);

  const collisionDetection: CollisionDetection = useCallback((args) => {
    if (movedColumn.current && lastOverId.current !== null) return [{ id: lastOverId.current }];

    const pointerHits = pointerWithin(args);
    const hits = pointerHits.length > 0 ? pointerHits : rectIntersection(args);
    let result = hits;
    const first = getFirstCollision(hits, "id");
    const column = first === null ? null : columnFromDropId(first);
    if (column) {
      // Over a column's empty space: target its nearest card so the drop lands in the right slot.
      const ids = latest.current.columnIds[column];
      const cards = args.droppableContainers.filter((container) =>
        ids.includes(String(container.id)),
      );
      if (cards.length > 0) result = closestCenter({ ...args, droppableContainers: cards });
    }
    lastOverId.current = getFirstCollision(result, "id") ?? lastOverId.current;
    return result;
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press on touch so a swipe still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Enter opens the task, so only Space picks a card up.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  // Announce a move only when the card's place actually changes, so "Picked up…" is not
  // immediately replaced by a redundant "moved to" for the same spot.
  const lastAnnouncedPlace = useRef("");
  const announcements = useMemo<Announcements>(() => {
    const title = (id: UniqueIdentifier) =>
      `"${latest.current.tasksById.get(String(id))?.title ?? "Task"}"`;
    const place = (id: UniqueIdentifier) => {
      const ids = latest.current.columnIds;
      const column = columnOf(ids, id);
      if (!column) return "";
      const position = ids[column].indexOf(String(id)) + 1;
      return `${TASK_STATUS_LABEL[column]}, position ${position} of ${ids[column].length}`;
    };
    return {
      onDragStart: ({ active }) => {
        lastAnnouncedPlace.current = place(active.id);
        return `Picked up ${title(active.id)} in ${lastAnnouncedPlace.current}.`;
      },
      onDragOver: ({ active, over }) => {
        if (!over) return `${title(active.id)} is not over a column.`;
        const current = place(active.id);
        if (current === lastAnnouncedPlace.current) return undefined;
        lastAnnouncedPlace.current = current;
        return `${title(active.id)} moved to ${current}.`;
      },
      onDragEnd: ({ active, over }) =>
        over
          ? `Dropped ${title(active.id)} in ${place(active.id)}.`
          : `${title(active.id)} was not moved.`,
      onDragCancel: ({ active }) => `Move cancelled. ${title(active.id)} is back where it was.`,
    };
  }, []);

  function handleDragStart({ active }: DragStartEvent) {
    lastOverId.current = null;
    setDrag({
      activeId: String(active.id),
      columns: baseIds,
      overColumn: columnOf(baseIds, active.id),
    });
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    setDrag((previous) => {
      if (!previous) return previous;
      const from = columnOf(previous.columns, active.id);
      const to = columnOf(previous.columns, over.id);
      if (!from || !to) return previous;
      if (from === to) {
        return previous.overColumn === to ? previous : { ...previous, overColumn: to };
      }

      // Crossing into another column: insert above or below the card under the pointer.
      const activeId = String(active.id);
      const target = previous.columns[to].filter((id) => id !== activeId);
      const overIndex = target.indexOf(String(over.id));
      const translated = active.rect.current.translated;
      const below = translated !== null && translated.top > over.rect.top + over.rect.height / 2;
      const index = overIndex === -1 ? target.length : overIndex + (below ? 1 : 0);
      target.splice(index, 0, activeId);

      movedColumn.current = true;
      return {
        ...previous,
        overColumn: to,
        columns: {
          ...previous.columns,
          [from]: previous.columns[from].filter((id) => id !== activeId),
          [to]: target,
        },
      };
    });
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const state = drag;
    setDrag(null);
    if (!state || !over) return;

    const activeId = String(active.id);
    const task = tasksById.get(activeId);
    const status = columnOf(state.columns, activeId);
    if (!task || !status) return;

    // Within a column, dnd-kit only animates the reorder; apply it now.
    let ids = state.columns[status];
    const from = ids.indexOf(activeId);
    const to = ids.indexOf(String(over.id));
    if (to !== -1 && to !== from) ids = arrayMove(ids, from, to);

    const index = ids.indexOf(activeId);
    if (status === task.status && baseIds[status].indexOf(activeId) === index) return;

    const neighbours = ids.filter((id) => id !== activeId).flatMap((id) => tasksById.get(id) ?? []);
    onMove(activeId, status, orderAtIndex(neighbours, index));
  }

  const dropAnimation: DropAnimation | null = reduceMotion
    ? null
    : {
        duration: 260,
        easing: "cubic-bezier(0.2, 0.9, 0.25, 1.15)",
        sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } }),
      };

  const activeTask = drag ? tasksById.get(drag.activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      accessibility={{ announcements, screenReaderInstructions: SCREEN_READER_INSTRUCTIONS }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDrag(null)}
    >
      <div className="flex flex-1 snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-6 md:scroll-px-8 md:px-8 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {TASK_STATUSES.map((status) => {
          const ids = columnIds[status];
          return (
            <BoardColumn
              key={status}
              status={status}
              count={ids.length}
              taskIds={ids}
              highlighted={drag?.overColumn === status}
            >
              {loading ? (
                <CardSkeletons />
              ) : (
                <>
                  <ul className="flex flex-col gap-2">
                    {ids.flatMap((id) => {
                      const task = tasksById.get(id);
                      return task ? <SortableTaskCard key={id} task={task} /> : [];
                    })}
                  </ul>
                  {ids.length === 0 && renderEmpty(status)}
                  {renderFooter?.(status)}
                </>
              )}
            </BoardColumn>
          );
        })}
      </div>
      <DragPortal>
        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask && (
            <motion.div
              initial={{ scale: 1, rotate: 0 }}
              animate={{ scale: 1.04, rotate: -1.5 }}
              transition={springs.snappy}
            >
              <TaskCard task={activeTask} state="lifted" />
            </motion.div>
          )}
        </DragOverlay>
      </DragPortal>
    </DndContext>
  );
}

/** The overlay lives in <body> so no scrolling or transformed ancestor can clip it. */
function DragPortal({ children }: Readonly<{ children: ReactNode }>) {
  const isClient = useIsClient();
  return isClient ? createPortal(children, document.body) : null;
}

function CardSkeletons() {
  return (
    <div aria-hidden className="flex flex-col gap-2">
      {[0, 1].map((index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl bg-white/4" />
      ))}
    </div>
  );
}
