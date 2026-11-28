import type { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { sessionSchema } from "@/lib/client/api";
import { sessionKey, settingsKey, tasksKey } from "@/lib/client/query-keys";
import { readSettings } from "@/lib/domain/settings";
import { taskSchema } from "@/lib/domain/task";

/** Bump when a saved shape changes incompatibly; snapshots of other versions are ignored. */
const SNAPSHOT_VERSION = 1;

/** The server data worth having offline, each with the schema its saved copy must still pass. */
const PERSISTED_QUERIES = [
  { queryKey: sessionKey, schema: sessionSchema },
  { queryKey: tasksKey, schema: z.array(taskSchema) },
  // Settings saved before a field existed keep what they have; the rest read as defaults.
  { queryKey: settingsKey, schema: z.unknown().transform(readSettings) },
] as const;

const PERSISTED_NAMES: ReadonlySet<unknown> = new Set(
  PERSISTED_QUERIES.map(({ queryKey }) => queryKey[0]),
);

const snapshotSchema = z.object({
  version: z.literal(SNAPSHOT_VERSION),
  /** The user this data and the outbox belong to, once a session has confirmed it. */
  owner: z.string().nullable(),
  queries: z.array(z.object({ name: z.string(), data: z.unknown(), updatedAt: z.number() })),
});
export type CacheSnapshot = z.infer<typeof snapshotSchema>;

export function isPersistedQuery(queryKey: readonly unknown[]): boolean {
  return queryKey.length === 1 && PERSISTED_NAMES.has(queryKey[0]);
}

/** The persisted queries' current data. A signed-out (null) session is not worth keeping. */
export function takeSnapshot(queryClient: QueryClient, owner: string | null): CacheSnapshot {
  const queries: CacheSnapshot["queries"] = [];
  for (const { queryKey } of PERSISTED_QUERIES) {
    const state = queryClient.getQueryState(queryKey);
    if (state?.data === undefined || state.data === null) continue;
    queries.push({ name: queryKey[0], data: state.data, updatedAt: state.dataUpdatedAt });
  }
  return { version: SNAPSHOT_VERSION, owner, queries };
}

/**
 * Puts saved data back into the cache, marked stale: it shows at once, and is refetched as soon
 * as it is used with a connection (a reload should still bring in edits made elsewhere). Data
 * that no longer validates is skipped. Returns the snapshot's owner.
 */
export function restoreSnapshot(queryClient: QueryClient, saved: unknown): string | null {
  const snapshot = snapshotSchema.safeParse(saved);
  if (!snapshot.success) return null;
  for (const { queryKey, schema } of PERSISTED_QUERIES) {
    const entry = snapshot.data.queries.find((query) => query.name === queryKey[0]);
    const data = entry ? schema.safeParse(entry.data) : undefined;
    if (entry && data?.success) {
      queryClient.setQueryData(queryKey, data.data, { updatedAt: entry.updatedAt });
      void queryClient.invalidateQueries({ queryKey, exact: true, refetchType: "none" });
    }
  }
  return snapshot.data.owner;
}
