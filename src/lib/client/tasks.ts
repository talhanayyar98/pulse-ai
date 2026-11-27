"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  applyTaskPatch,
  createTask,
  markTaskDeleted,
  orderAtTopOf,
  type Task,
  type TaskDraft,
  type TaskPatch,
} from "@/lib/domain/task";
import { useToasts } from "@/lib/stores/toasts";
import { api } from "./api";
import { usePendingTasks, withPending } from "./pending";
import { useSession } from "./session";

export const tasksKey = ["tasks"] as const;

/** Tasks as the user should see them: server state plus their unsaved edits, minus deletions. */
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
  return { data, isPending: query.isPending, isError: query.isError, refetch: query.refetch };
}

/** Takes the server's copy unless the cache already holds a newer version. */
function adoptServerCopy(tasks: Task[] | undefined, serverTask: Task): Task[] {
  const cached = tasks?.find((task) => task.id === serverTask.id);
  if (cached && Date.parse(cached.updatedAt) > Date.parse(serverTask.updatedAt)) {
    return tasks ?? [];
  }
  return [...(tasks ?? []).filter((task) => task.id !== serverTask.id), serverTask];
}

export function useTaskActions() {
  const queryClient = useQueryClient();
  const pushToast = useToasts((state) => state.push);

  const { mutate: save } = useMutation({
    mutationFn: (task: Task) => api.sync([{ opId: crypto.randomUUID(), type: "task.put", task }]),
    onSuccess: ({ results }) => {
      for (const { task } of results) {
        queryClient.setQueryData<Task[]>(tasksKey, (tasks) => adoptServerCopy(tasks, task));
      }
    },
    onError: () => {
      pushToast({
        title: "Couldn't save that change",
        description: "Showing the last saved version instead.",
      });
      void queryClient.invalidateQueries({ queryKey: tasksKey });
    },
    onSettled: (_data, _error, task) => usePendingTasks.getState().settle(task),
  });

  return useMemo(() => {
    const current = () =>
      withPending(
        queryClient.getQueryData<Task[]>(tasksKey) ?? [],
        usePendingTasks.getState().byId,
      );
    const find = (id: string) => current().find((task) => task.id === id && !task.deletedAt);
    const commit = (task: Task) => {
      // A refetch already in flight predates this edit; drop it so it can't land afterwards
      // and briefly show the old version once the edit is acknowledged. (Never cancel the
      // first load: there would be nothing to fall back to.)
      if (queryClient.getQueryData(tasksKey))
        void queryClient.cancelQueries({ queryKey: tasksKey });
      usePendingTasks.getState().put(task);
      save(task);
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
        commit(applyTaskPatch(task, placed, new Date()));
      },

      remove(id: string): void {
        const task = find(id);
        if (task) commit(markTaskDeleted(task, new Date()));
      },
    };
  }, [queryClient, save]);
}
