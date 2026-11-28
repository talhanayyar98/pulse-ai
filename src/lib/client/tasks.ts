"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createdByCompletion, nextOccurrenceTask } from "@/lib/domain/series";
import {
  applyTaskPatch,
  createTask,
  markTaskDeleted,
  orderAtTopOf,
  type Task,
  type TaskDraft,
  type TaskPatch,
} from "@/lib/domain/task";
import { formatOccurrence } from "@/lib/recurrence-label";
import { useToasts } from "@/lib/stores/toasts";
import { api } from "./api";
import { usePendingTasks, withPending } from "./pending";
import { tasksKey } from "./query-keys";
import { useSession } from "./session";
import { cachedSettings } from "./settings";

/**
 * Tasks as the user should see them: server state plus their unsaved edits, minus deletions.
 * `isError` means there is nothing to show: a failed refetch over saved data (offline, say)
 * keeps showing that data, and the sync indicator says why it may be out of date.
 */
export function useTasks() {
  const session = useSession();
  const query = useQuery({
    queryKey: tasksKey,
    queryFn: api.listTasks,
    enabled: Boolean(session.data),
  });
  const pending = usePendingTasks((state) => state.byId);
  const data = useMemo(
    () =>
      query.data ? withPending(query.data, pending).filter((task) => !task.deletedAt) : undefined,
    [query.data, pending],
  );
  return {
    data,
    isPending: query.isPending,
    isError: query.isError && query.data === undefined,
    refetch: query.refetch,
  };
}

/**
 * Edits land in the outbox (the pending store) synchronously; the offline client saves them on
 * this device and sends them to the server whenever it can.
 */
export function useTaskActions() {
  const queryClient = useQueryClient();
  const pushToast = useToasts((state) => state.push);

  return useMemo(() => {
    const current = () =>
      withPending(
        queryClient.getQueryData<Task[]>(tasksKey) ?? [],
        usePendingTasks.getState().byId,
      );
    const find = (id: string) => current().find((task) => task.id === id && !task.deletedAt);
    const commit = (task: Task) => usePendingTasks.getState().put(task);

    /**
     * Completing a repeating task creates its next occurrence; reopening it takes back that
     * occurrence while it is still untouched.
     */
    const followSeries = (before: Task, after: Task, now: Date) => {
      if (after.status === "done") {
        const next = nextOccurrenceTask(after, {
          now,
          order: orderAtTopOf(current(), "todo"),
          weekStartsOn: cachedSettings(queryClient).weekStartsOn,
        });
        if (!next || find(next.id)) return;
        commit(next);
        pushToast({
          title: `Next one: ${formatOccurrence(new Date(next.dueAt ?? ""), next.allDay)}`,
          description: next.title,
          tone: "success",
        });
      } else if (before.status === "done") {
        const created = createdByCompletion(before, current());
        if (created) commit(markTaskDeleted(created, now));
      }
    };

    return {
      create(draft: TaskDraft): Task {
        const task = createTask(draft, {
          id: crypto.randomUUID(),
          order: orderAtTopOf(current(), draft.status ?? "todo"),
          now: new Date(),
        });
        commit(task);
        return task;
      },

      update(id: string, patch: TaskPatch): void {
        const task = find(id);
        if (!task) return;
        // Changing column without an explicit position puts the task on top of the new column.
        const movesColumn = patch.status !== undefined && patch.status !== task.status;
        const placed =
          movesColumn && patch.order === undefined && patch.status
            ? { ...patch, order: orderAtTopOf(current(), patch.status) }
            : patch;
        const now = new Date();
        const updated = applyTaskPatch(task, placed, now);
        commit(updated);
        if (updated.status !== task.status) followSeries(task, updated, now);
      },

      remove(id: string): void {
        const task = find(id);
        if (task) commit(markTaskDeleted(task, new Date()));
      },
    };
  }, [queryClient, pushToast]);
}
