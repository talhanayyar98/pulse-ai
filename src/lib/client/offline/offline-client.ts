import { onlineManager, type QueryCacheNotifyEvent, type QueryClient } from "@tanstack/react-query";
import { api, sessionSchema } from "@/lib/client/api";
import { usePendingTasks } from "@/lib/client/pending";
import { notificationsKey, sessionKey, settingsKey, tasksKey } from "@/lib/client/query-keys";
import { type Task, taskSchema } from "@/lib/domain/task";
import { useToasts } from "@/lib/stores/toasts";
import { createIdbStorage } from "./idb";
import { isPersistedQuery, restoreSnapshot, takeSnapshot } from "./snapshot";
import type { OfflineStorage, StoredState } from "./storage";
import { SyncEngine } from "./sync-engine";

/** Saves are batched: a burst of cache updates (a sync answering ten ops) writes once. */
const PERSIST_DELAY_MS = 250;

export interface OfflineClient {
  readonly engine: SyncEngine;
  /**
   * Restores the last visit's data and outbox, then keeps both saved and the outbox syncing.
   * `onRestored` runs once the cache holds the restored data. Returns a cleanup.
   */
  start(onRestored: () => void): () => void;
  /**
   * Syncs what's left, then stops and forgets this device's data. Resolves false (and changes
   * nothing) when some edits couldn't be synced.
   */
  prepareSignOut(): Promise<boolean>;
}

function reportStorageError(error: unknown): void {
  console.error("Pulse couldn't use offline storage", error);
}

/** Takes the server's copy unless the cache already holds a newer version. */
function adoptServerCopy(tasks: Task[], serverTask: Task): Task[] {
  const cached = tasks.find((task) => task.id === serverTask.id);
  if (cached && Date.parse(cached.updatedAt) > Date.parse(serverTask.updatedAt)) return tasks;
  return [...tasks.filter((task) => task.id !== serverTask.id), serverTask];
}

export function createOfflineClient(
  queryClient: QueryClient,
  storage: OfflineStorage = createIdbStorage(),
): OfflineClient {
  /** Whose data the cache and outbox hold, as last confirmed by the server. */
  let owner: string | null = null;
  /** The user of the session the server confirmed during this page's life. */
  let confirmedUser: string | null = null;
  /** Synced snapshots to drop from storage with the next save (which includes their result). */
  let settled: Task[] = [];
  let persistTimer: ReturnType<typeof setTimeout> | undefined;
  let detach: (() => void) | undefined;

  function persistNow(): void {
    clearTimeout(persistTimer);
    persistTimer = undefined;
    const done = settled;
    settled = [];
    storage.save(takeSnapshot(queryClient, owner), done).catch(reportStorageError);
  }

  function schedulePersist(): void {
    // Before the restore finishes, the cache is still empty: saving it would wipe the snapshot.
    if (detach && persistTimer === undefined)
      persistTimer = setTimeout(persistNow, PERSIST_DELAY_MS);
  }

  /**
   * Another account signed in on this device. The previous one's data and unsynced edits are
   * neither theirs to see nor theirs to send.
   */
  function forgetPreviousUser(): void {
    usePendingTasks.getState().clear();
    storage.clear().catch(reportStorageError);
    for (const queryKey of [tasksKey, settingsKey, notificationsKey]) {
      void queryClient.resetQueries({ queryKey });
    }
  }

  function confirmSession(userId: string | null): void {
    confirmedUser = userId;
    if (userId === null) return;
    if (owner !== userId) {
      if (owner !== null) forgetPreviousUser();
      owner = userId;
      schedulePersist();
    }
    if (engine.getPhase() === "signed-out") engine.retryNow();
  }

  const engine = new SyncEngine({
    pending: () => Object.values(usePendingTasks.getState().byId),
    settle: (task) => usePendingTasks.getState().settle(task),
    send: (ops) => api.sync(ops),
    async verifyUser() {
      if (confirmedUser === null) {
        const session = await queryClient.fetchQuery({
          queryKey: sessionKey,
          queryFn: api.session,
          staleTime: 0,
        });
        confirmSession(session?.user.id ?? null);
      }
      return confirmedUser !== null;
    },
    async adopt(serverTasks) {
      // A tasks fetch that started before this write would land afterwards with older versions.
      const refetching = queryClient.isFetching({ queryKey: tasksKey }) > 0;
      if (refetching) await queryClient.cancelQueries({ queryKey: tasksKey });
      queryClient.setQueryData<Task[]>(
        tasksKey,
        (tasks) => tasks && serverTasks.reduce(adoptServerCopy, tasks),
      );
      if (refetching) void queryClient.invalidateQueries({ queryKey: tasksKey });
    },
    onOverridden(tasks) {
      const [only] = tasks;
      useToasts.getState().push(
        tasks.length === 1 && only
          ? {
              title: `“${only.title}” was edited elsewhere`,
              description: "That edit was more recent than yours, so it was kept.",
            }
          : {
              title: `${tasks.length} tasks were edited elsewhere`,
              description: "Those edits were more recent than yours, so they were kept.",
            },
      );
    },
    onRejected(task) {
      useToasts.getState().push({
        title: `Couldn't save “${task.title}”`,
        description: "Showing the last saved version instead.",
      });
      void queryClient.invalidateQueries({ queryKey: tasksKey });
    },
    onSignedOut() {
      confirmedUser = null;
      // The guard sends a confirmed signed-out user to sign in; the outbox waits for them.
      void queryClient.invalidateQueries({ queryKey: sessionKey });
    },
    isOnline: () => onlineManager.isOnline(),
  });

  function onPendingChange(
    next: Readonly<Record<string, Task>>,
    previous: Readonly<Record<string, Task>>,
  ): void {
    if (next === previous) return;
    for (const task of Object.values(next)) {
      if (previous[task.id] !== task) storage.queue(task).catch(reportStorageError);
    }
    const removed = Object.values(previous).filter((task) => next[task.id] === undefined);
    if (removed.length > 0) {
      settled.push(...removed);
      schedulePersist();
    }
    engine.schedule();
  }

  function onQueryEvent(event: QueryCacheNotifyEvent): void {
    if (!isPersistedQuery(event.query.queryKey)) return;
    if (event.type === "removed") schedulePersist();
    if (event.type !== "updated") return;
    const { action } = event;
    if (action.type === "success" || action.type === "setState") schedulePersist();
    // A session the server just answered with: not one restored from storage or set by hand.
    if (action.type === "success" && !action.manual && event.query.queryKey[0] === sessionKey[0]) {
      const session = sessionSchema.safeParse(event.query.state.data);
      confirmSession(session.success ? session.data.user.id : null);
    }
  }

  function restore({ snapshot, outbox }: StoredState): void {
    owner = restoreSnapshot(queryClient, snapshot);
    const queued = outbox.flatMap((entry) => {
      const task = taskSchema.safeParse(entry);
      return task.success ? [task.data] : [];
    });
    const earlier = Object.values(usePendingTasks.getState().byId);
    usePendingTasks.getState().restore(queued);
    // Edits made in the moments before the restore finished aren't in storage yet.
    const kept = usePendingTasks.getState().byId;
    for (const task of earlier) {
      if (kept[task.id] === task) storage.queue(task).catch(reportStorageError);
    }
  }

  function attach(): () => void {
    const flushPersist = () => {
      if (persistTimer !== undefined) persistNow();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") engine.retryNow();
      else flushPersist();
    };
    const unsubscribe = [
      usePendingTasks.subscribe((state, previous) => onPendingChange(state.byId, previous.byId)),
      queryClient.getQueryCache().subscribe(onQueryEvent),
      onlineManager.subscribe((online) => {
        if (online) engine.retryNow();
      }),
    ];
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushPersist);
    return () => {
      for (const stop of unsubscribe) stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushPersist);
      clearTimeout(persistTimer);
      persistTimer = undefined;
    };
  }

  return {
    engine,

    start(onRestored) {
      let active = true;
      // TanStack Query assumes it is online until an event says otherwise, so a page opened
      // offline would fail its fetches instead of waiting for the connection.
      onlineManager.setOnline(navigator.onLine);
      void storage
        .load()
        .catch((error: unknown): StoredState => {
          reportStorageError(error);
          return { snapshot: undefined, outbox: [] };
        })
        .then((stored) => {
          if (!active) return;
          restore(stored);
          detach = attach();
          onRestored();
          engine.schedule();
        });
      return () => {
        active = false;
        detach?.();
        detach = undefined;
      };
    },

    async prepareSignOut() {
      if ((await engine.drain()) > 0) return false;
      engine.stop();
      detach?.();
      detach = undefined;
      await storage.clear().catch(reportStorageError);
      return true;
    },
  };
}
