import type { Task } from "@/lib/domain/task";
import type { CacheSnapshot } from "./snapshot";
import type { OfflineStorage, StoredState } from "./storage";

/** Database layout. A new store or index means a new version and a step in `upgrade`. */
export const OFFLINE_DB = { name: "pulse", version: 1 } as const;
const KV = "kv";
const OUTBOX = "outbox";
const SNAPSHOT_KEY = "snapshot";

function upgrade(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
  if (!db.objectStoreNames.contains(OUTBOX)) db.createObjectStore(OUTBOX, { keyPath: "id" });
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB.name, OFFLINE_DB.version);
    request.onupgradeneeded = () => upgrade(request.result);
    request.onsuccess = () => {
      const db = request.result;
      // Step aside when a newer version of the app (in another tab) needs to upgrade.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error("Couldn't open IndexedDB"));
  });
}

/** Runs `body` in one transaction; resolves once it has committed, so the write is durable. */
function transact<T>(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
  body: (tx: IDBTransaction) => () => T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    const result = body(tx);
    tx.oncomplete = () => resolve(result());
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

/**
 * IndexedDB-backed storage. The database opens on first use and is shared by later calls; if
 * it can't open (some private browsing modes), every call rejects and the app works online only.
 */
export function createIdbStorage(): OfflineStorage {
  let db: Promise<IDBDatabase> | undefined;
  const connection = () => (db ??= open());

  return {
    async load(): Promise<StoredState> {
      return transact(await connection(), [KV, OUTBOX], "readonly", (tx) => {
        const snapshot: IDBRequest<unknown> = tx.objectStore(KV).get(SNAPSHOT_KEY);
        const outbox: IDBRequest<unknown[]> = tx.objectStore(OUTBOX).getAll();
        return () => ({ snapshot: snapshot.result, outbox: outbox.result });
      });
    },

    async queue(task: Task): Promise<void> {
      await transact(await connection(), [OUTBOX], "readwrite", (tx) => {
        tx.objectStore(OUTBOX).put(task);
        return () => undefined;
      });
    },

    async save(snapshot: CacheSnapshot, settled: readonly Task[]): Promise<void> {
      await transact(await connection(), [KV, OUTBOX], "readwrite", (tx) => {
        tx.objectStore(KV).put(snapshot, SNAPSHOT_KEY);
        const outbox = tx.objectStore(OUTBOX);
        for (const task of settled) {
          const queued: IDBRequest<unknown> = outbox.get(task.id);
          queued.onsuccess = () => {
            if (isQueuedVersion(queued.result, task)) outbox.delete(task.id);
          };
        }
        return () => undefined;
      });
    },

    async clear(): Promise<void> {
      await transact(await connection(), [KV, OUTBOX], "readwrite", (tx) => {
        tx.objectStore(KV).clear();
        tx.objectStore(OUTBOX).clear();
        return () => undefined;
      });
    },
  };
}

function isQueuedVersion(stored: unknown, task: Task): boolean {
  return (
    typeof stored === "object" &&
    stored !== null &&
    "updatedAt" in stored &&
    stored.updatedAt === task.updatedAt
  );
}
