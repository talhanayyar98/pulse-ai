"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useWeekStartsOn } from "@/lib/client/settings";
import { useTaskActions, useTasks } from "@/lib/client/tasks";
import { hasActiveFilters, matchesFilters, splitDoneTasks } from "@/lib/domain/filters";
import { normalizeLabels, type Task, tasksInColumn } from "@/lib/domain/task";
import { TASK_STATUSES, type TaskStatus } from "@/lib/domain/task-status";
import { useNow } from "@/lib/hooks/use-now";
import { useBoardFilters } from "@/lib/stores/board-filters";
import { BoardDnd } from "./BoardDnd";
import { DoneOlderToggle } from "./DoneOlderToggle";
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
  const weekStartsOn = useWeekStartsOn();

  // Saved filters are applied after hydration (the page itself is static).
  useEffect(() => {
    void useBoardFilters.persist.rehydrate();
  }, []);

  const visible = useMemo(
    () => tasks.filter((task) => matchesFilters(task, filters, now, weekStartsOn)),
    [tasks, filters, now, weekStartsOn],
  );
  const [showOlderDone, setShowOlderDone] = useState(false);
  const olderDone = useMemo(
    () => splitDoneTasks(tasksInColumn(visible, "done"), now).older,
    [visible, now],
  );
  const columns = useMemo(() => {
    const hidden = new Set(showOlderDone ? [] : olderDone.map((task) => task.id));
    return Object.fromEntries(
      TASK_STATUSES.map((status) => [
        status,
        tasksInColumn(visible, status).filter((task) => !hidden.has(task.id)),
      ]),
    ) as Record<TaskStatus, Task[]>;
  }, [visible, olderDone, showOlderDone]);
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
      <div className="mx-5 flex animate-fade-up items-center justify-between gap-4 rounded-2xl border border-danger/30 bg-danger/8 p-4 md:mx-8">
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
          <p className="grid h-36 animate-fade-up place-items-center rounded-xl border border-dashed border-fg/15 bg-surface/50 px-4 text-center text-sm text-fg-muted transition-colors duration-300 hover:border-fg/25 hover:text-fg-secondary">
            {filtering && tasks.some((task) => task.status === status)
              ? "Nothing here matches your filters."
              : EMPTY_COLUMN_COPY[status]}
          </p>
        )}
        renderFooter={(status) =>
          status === "done" && olderDone.length > 0 ? (
            <DoneOlderToggle
              count={olderDone.length}
              expanded={showOlderDone}
              onToggle={() => setShowOlderDone((shown) => !shown)}
            />
          ) : null
        }
      />
    </>
  );
}
