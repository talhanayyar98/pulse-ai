import type { OfflineStorage } from "@/lib/client/offline/storage";
import type { CacheSnapshot } from "@/lib/client/offline/snapshot";
import type { Task } from "@/lib/domain/task";

/** OfflineStorage with IndexedDB's contract, kept in memory. */
export function createMemoryStorage(): OfflineStorage & { outbox: Map<string, Task> } {
  let snapshot: CacheSnapshot | undefined;
  const outbox = new Map<string, Task>();
  return {
    outbox,
    load: async () => ({ snapshot, outbox: [...outbox.values()] }),
    queue: async (task) => {
      outbox.set(task.id, task);
    },
    save: async (next, settled) => {
      snapshot = next;
      for (const task of settled) {
        if (outbox.get(task.id)?.updatedAt === task.updatedAt) outbox.delete(task.id);
      }
    },
    clear: async () => {
      snapshot = undefined;
      outbox.clear();
    },
  };
}
