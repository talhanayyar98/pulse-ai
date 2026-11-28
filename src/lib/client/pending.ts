import { create } from "zustand";
import type { Task } from "@/lib/domain/task";

/**
 * Local edits the server hasn't confirmed yet, newest snapshot per task: the outbox.
 *
 * What the UI renders is always "server cache + pending edits", and this store updates
 * synchronously. So the very next keystroke already sees the previous edit, and quick
 * successive edits (two subtasks in a row) can never be built on stale data and overwrite
 * each other. The offline client mirrors it to IndexedDB and replays it to the server.
 */
interface PendingState {
  byId: Readonly<Record<string, Task>>;
  put: (task: Task) => void;
  /** Called when the server has answered for `task`; keeps any newer edit made in the meantime. */
  settle: (task: Task) => void;
  /** Adds edits saved by an earlier visit, unless this page already holds a newer one. */
  restore: (tasks: readonly Task[]) => void;
  clear: () => void;
}

export const usePendingTasks = create<PendingState>()((set) => ({
  byId: {},
  put: (task) => set((state) => ({ byId: { ...state.byId, [task.id]: task } })),
  settle: (task) =>
    set((state) => {
      if (state.byId[task.id] !== task) return state;
      const { [task.id]: _settled, ...rest } = state.byId;
      return { byId: rest };
    }),
  restore: (tasks) =>
    set((state) => {
      const byId = { ...state.byId };
      for (const task of tasks) {
        const current = byId[task.id];
        if (!current || Date.parse(task.updatedAt) > Date.parse(current.updatedAt)) {
          byId[task.id] = task;
        }
      }
      return { byId };
    }),
  clear: () => set({ byId: {} }),
}));

/** Server tasks overlaid with pending local edits, including local deletions. */
export function withPending(
  serverTasks: readonly Task[],
  pending: Readonly<Record<string, Task>>,
): Task[] {
  const byId = new Map(serverTasks.map((task) => [task.id, task]));
  for (const task of Object.values(pending)) byId.set(task.id, task);
  return [...byId.values()];
}
