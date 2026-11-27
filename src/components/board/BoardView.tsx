"use client";

import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { useTaskActions, useTasks } from "@/lib/client/tasks";
import { hasActiveFilters, matchesFilters } from "@/lib/domain/filters";
import { normalizeLabels, type Task, tasksInColumn } from "@/lib/domain/task";
import { TASK_STATUSES, type TaskStatus } from "@/lib/domain/task-status";
import { useNow } from "@/lib/hooks/use-now";
import { useBoardFilters } from "@/lib/stores/board-filters";
import { BoardDnd } from "./BoardDnd";
import { FilterBar } from "./FilterBar";

const EMPTY_COLUMN_COPY: Record<TaskStatus, string> = {
  backlog: "Ideas wait here. No pressure.",
  todo: "Nothing queued. Suspiciously calm.",
  in_progress: "Idle hands. Pick something up.",
  done: "Victories land here.",
};

export function BoardView() {
  const { data: tasks = [], isPending, isError, refetch } = useTasks();
  const actions = useTaskActions();
  const filters = useBoardFilters((state) => state.filters);
  const now = useNow();

  // Saved filters are applied after hydration (the page itself is static).
  useEffect(() => {
    void useBoardFilters.persist.rehydrate();
  }, []);

  const visible = useMemo(
    () => tasks.filter((task) => matchesFilters(task, filters, now)),
    [tasks, filters, now],
  );
  const columns = useMemo(
    () =>
      Object.fromEntries(
        TASK_STATUSES.map((status) => [status, tasksInColumn(visible, status)]),
      ) as Record<TaskStatus, Task[]>,
    [visible],
  );
  const labels = useMemo(
    () =>
      normalizeLabels(tasks.flatMap((task) => task.labels)).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
      ),
    [tasks],
  );
  const filtering = hasActiveFilters(filters);

  if (isError) {
    return (
      <div className="mx-5 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface/70 p-4 md:mx-8">
        <p className="text-sm text-fg-secondary">Couldn&apos;t load your tasks.</p>
        <Button size="sm" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <>
      <FilterBar labels={labels} visibleCount={visible.length} totalCount={tasks.length} />
      <BoardDnd
        columns={columns}
        loading={isPending}
        onMove={(taskId, status, order) => actions.update(taskId, { status, order })}
        renderEmpty={(status) => (
          <p className="grid h-36 place-items-center rounded-xl border border-dashed border-line px-4 text-center text-sm text-fg-muted">
            {filtering && tasks.some((task) => task.status === status)
              ? "Nothing here matches your filters."
              : EMPTY_COLUMN_COPY[status]}
          </p>
        )}
      />
    </>
  );
}
