"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { useTaskActions, useTasks } from "@/lib/client/tasks";
import { type Task, tasksInColumn } from "@/lib/domain/task";
import { TASK_STATUSES, type TaskStatus } from "@/lib/domain/task-status";
import { BoardDnd } from "./BoardDnd";

const EMPTY_COLUMN_COPY: Record<TaskStatus, string> = {
  backlog: "Ideas wait here. No pressure.",
  todo: "Nothing queued. Suspiciously calm.",
  in_progress: "Idle hands. Pick something up.",
  done: "Victories land here.",
};

export function BoardView() {
  const { data: tasks, isPending, isError, refetch } = useTasks();
  const actions = useTaskActions();

  const columns = useMemo(
    () =>
      Object.fromEntries(
        TASK_STATUSES.map((status) => [status, tasksInColumn(tasks ?? [], status)]),
      ) as Record<TaskStatus, Task[]>,
    [tasks],
  );

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
    <BoardDnd
      columns={columns}
      loading={isPending}
      onMove={(taskId, status, order) => actions.update(taskId, { status, order })}
      renderEmpty={(status) => (
        <p className="grid h-36 place-items-center rounded-xl border border-dashed border-line px-4 text-center text-sm text-fg-muted">
          {EMPTY_COLUMN_COPY[status]}
        </p>
      )}
    />
  );
}
