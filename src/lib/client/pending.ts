import { create } from "zustand";
import type { Task } from "@/lib/domain/task";

/**
 * Local edits not yet acknowledged by the server, newest snapshot per task.
 *
 * What the UI renders is always "server cache + pending edits", and the pending store updates
 * synchronously. So the very next keystroke already sees the previous edit, and quick
 * successive edits (two subtasks in a row) can never be built on stale data and overwrite
 * each other. M5 persists this as the offline outbox.
 */
interface PendingState {
  byId: Readonly<Record<string, Task>>;
  put: (task: Task) => void;
  /** Called when `task`'s save finishes; keeps any newer edit made in the meantime. */
  settle: (task: Task) => void;
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
