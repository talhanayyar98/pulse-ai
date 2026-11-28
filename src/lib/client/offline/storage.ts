import type { Task } from "@/lib/domain/task";
import type { CacheSnapshot } from "./snapshot";

/** Everything saved by an earlier visit. `unknown`: an older version of the app may have written it. */
export interface StoredState {
  snapshot: unknown;
  outbox: unknown[];
}

/**
 * What this device keeps between visits: a snapshot of the last server data, and the outbox
 * of task snapshots the server hasn't confirmed yet.
 */
export interface OfflineStorage {
  load(): Promise<StoredState>;
  /** Adds or replaces the queued snapshot of `task`. */
  queue(task: Task): Promise<void>;
  /**
   * Saves the snapshot and, in the same step, drops `settled` from the outbox. Each one is
   * only dropped if it is still the queued version: another tab may have queued a newer edit.
   */
  save(snapshot: CacheSnapshot, settled: readonly Task[]): Promise<void>;
  clear(): Promise<void>;
}
