import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { ClientSession } from "@/lib/client/api";
import { isPersistedQuery, restoreSnapshot, takeSnapshot } from "@/lib/client/offline/snapshot";
import { sessionKey, settingsKey, tasksKey } from "@/lib/client/query-keys";
import { DEFAULT_SETTINGS } from "@/lib/domain/settings";
import { createTask, type Task } from "@/lib/domain/task";

const session: ClientSession = {
  user: { id: "user-alice", name: "Alice", email: "alice@example.com" },
  expires: "2027-01-01T00:00:00.000Z",
};
const task = createTask(
  { title: "Book flights" },
  { id: crypto.randomUUID(), order: "a0", now: new Date("2026-12-01T09:00:00.000Z") },
);

function filledClient(): QueryClient {
  const client = new QueryClient();
  client.setQueryData(sessionKey, session, { updatedAt: 1_000 });
  client.setQueryData(tasksKey, [task], { updatedAt: 2_000 });
  client.setQueryData(settingsKey, { ...DEFAULT_SETTINGS, weekStartsOn: 0 }, { updatedAt: 3_000 });
  return client;
}

/** Structured clone, as IndexedDB stores it. */
const stored = <T>(value: T): T => structuredClone(value);

describe("offline snapshot", () => {
  it("brings back the session, tasks and settings, to be refetched when next used", () => {
    const snapshot = stored(takeSnapshot(filledClient(), "user-alice"));
    const client = new QueryClient();

    expect(restoreSnapshot(client, snapshot)).toBe("user-alice");
    expect(client.getQueryData(sessionKey)).toEqual(session);
    expect(client.getQueryData<Task[]>(tasksKey)).toEqual([task]);
    expect(client.getQueryData(settingsKey)).toEqual({ ...DEFAULT_SETTINGS, weekStartsOn: 0 });
    expect(client.getQueryState(tasksKey)).toMatchObject({
      dataUpdatedAt: 2_000,
      isInvalidated: true,
    });
  });

  it("fills in settings saved before a field existed", () => {
    const client = new QueryClient();
    client.setQueryData(settingsKey, { weekStartsOn: 6 });
    const restored = new QueryClient();
    restoreSnapshot(restored, stored(takeSnapshot(client, "user-alice")));
    expect(restored.getQueryData(settingsKey)).toEqual({ ...DEFAULT_SETTINGS, weekStartsOn: 6 });
  });

  it("keeps neither a signed-out session nor queries that never loaded", () => {
    const client = new QueryClient();
    client.setQueryData(sessionKey, null);
    expect(takeSnapshot(client, null).queries).toEqual([]);
  });

  it("skips saved data that no longer validates and restores the rest", () => {
    const snapshot = stored(takeSnapshot(filledClient(), "user-alice"));
    const tasksEntry = snapshot.queries.find((query) => query.name === "tasks");
    if (tasksEntry) tasksEntry.data = [{ ...task, status: "archived" }];
    const client = new QueryClient();

    restoreSnapshot(client, snapshot);
    expect(client.getQueryData(tasksKey)).toBeUndefined();
    expect(client.getQueryData(sessionKey)).toEqual(session);
  });

  it("ignores a snapshot from another version, or anything else", () => {
    const snapshot = { ...takeSnapshot(filledClient(), "user-alice"), version: 0 };
    for (const saved of [snapshot, undefined, "junk"]) {
      const client = new QueryClient();
      expect(restoreSnapshot(client, saved)).toBeNull();
      expect(client.getQueryCache().getAll()).toHaveLength(0);
    }
  });

  it("only keeps the session, tasks and settings queries", () => {
    expect(isPersistedQuery(tasksKey)).toBe(true);
    expect(isPersistedQuery(["tasks", "archived"])).toBe(false);
    expect(isPersistedQuery(["notifications"])).toBe(false);
  });
});
