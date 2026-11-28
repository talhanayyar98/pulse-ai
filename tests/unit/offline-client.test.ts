import { onlineManager, QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, type ClientSession } from "@/lib/client/api";
import { createOfflineClient } from "@/lib/client/offline/offline-client";
import { takeSnapshot } from "@/lib/client/offline/snapshot";
import { usePendingTasks } from "@/lib/client/pending";
import { sessionKey, tasksKey } from "@/lib/client/query-keys";
import { applyTaskPatch, createTask, type Task } from "@/lib/domain/task";
import { createFakeSyncServer } from "../support/fake-sync-server";
import { createMemoryStorage } from "../support/memory-storage";

const t0 = new Date("2026-12-01T09:00:00.000Z");

function newTask(title: string): Task {
  return createTask({ title }, { id: crypto.randomUUID(), order: "a0", now: t0 });
}

function sessionOf(id: string): ClientSession {
  return { user: { id, name: id }, expires: "2027-01-01T00:00:00.000Z" };
}

/** A snapshot an earlier visit by `owner` would have saved. */
function savedVisit(owner: string, tasks: Task[]) {
  const earlier = new QueryClient();
  earlier.setQueryData(sessionKey, sessionOf(owner));
  earlier.setQueryData(tasksKey, tasks);
  return takeSnapshot(earlier, owner);
}

/** Lets timers (the engine's, the persist delay, TanStack's) and promise chains run. */
const tick = (ms = 0) => vi.advanceTimersByTimeAsync(ms);
const PERSIST_DELAY_MS = 250;

let server: ReturnType<typeof createFakeSyncServer>;
let signedInAs: string | null;
/** Each client subscribes to app-wide stores; stop them so tests can't hear each other. */
const running: Array<() => void> = [];

beforeEach(() => {
  vi.useFakeTimers();
  // The browser globals the client listens to.
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
  vi.stubGlobal("navigator", { onLine: true });
  usePendingTasks.getState().clear();
  server = createFakeSyncServer();
  signedInAs = "user-alice";
  vi.spyOn(api, "session").mockImplementation(async () =>
    signedInAs ? sessionOf(signedInAs) : null,
  );
  vi.spyOn(api, "sync").mockImplementation(server.sync);
});

afterEach(() => {
  for (const stop of running.splice(0)) stop();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  onlineManager.setOnline(true);
});

function setup(storage = createMemoryStorage()) {
  const queryClient = new QueryClient();
  const client = createOfflineClient(queryClient, storage);
  const restored = vi.fn();
  running.push(client.start(restored));
  return { queryClient, client, storage, restored };
}

describe("offline client", () => {
  it("restores the last visit's tasks and unsynced edits, then syncs the edits", async () => {
    const synced = newTask("Book flights");
    const unsynced = newTask("Renew passport");
    const storage = createMemoryStorage();
    await storage.save(savedVisit("user-alice", [synced]), []);
    await storage.queue(unsynced);

    const { queryClient, restored } = setup(storage);
    await tick();

    expect(restored).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData<Task[]>(tasksKey)?.map((task) => task.title)).toContain(
      "Book flights",
    );
    expect(server.tasks.get(unsynced.id)?.title).toBe("Renew passport");
    expect(usePendingTasks.getState().byId).toEqual({});
  });

  it("keeps an edit in storage until a snapshot holding the server's copy is saved", async () => {
    const { queryClient, storage } = setup();
    await tick();
    queryClient.setQueryData<Task[]>(tasksKey, []);

    const task = newTask("Book flights");
    usePendingTasks.getState().put(task);
    expect(storage.outbox.get(task.id)).toBe(task);

    await tick();
    expect(server.tasks.has(task.id)).toBe(true);
    // Synced, but a reload now must still find it somewhere: it stays queued until the save.
    expect(storage.outbox.has(task.id)).toBe(true);

    await tick(PERSIST_DELAY_MS);
    expect(storage.outbox.has(task.id)).toBe(false);
    const { snapshot } = await storage.load();
    expect(JSON.stringify(snapshot)).toContain("Book flights");
  });

  it("queues edits while offline and sends them when the connection returns", async () => {
    const { storage } = setup();
    await tick();
    onlineManager.setOnline(false);

    const task = newTask("Book flights");
    usePendingTasks.getState().put(task);
    const renamed = applyTaskPatch(
      task,
      { title: "Book flights to Lisbon" },
      new Date(t0.getTime() + 1),
    );
    usePendingTasks.getState().put(renamed);
    await tick(60_000);
    expect(server.requests).toHaveLength(0);
    expect(storage.outbox.get(task.id)).toBe(renamed);

    onlineManager.setOnline(true);
    await tick();
    expect(server.requests.flat().map((op) => op.task.title)).toEqual(["Book flights to Lisbon"]);
  });

  it("forgets another account's data and edits instead of sending them as the new user", async () => {
    const theirs = newTask("Alice's draft");
    const storage = createMemoryStorage();
    await storage.save(savedVisit("user-alice", [newTask("Alice's task")]), []);
    await storage.queue(theirs);
    signedInAs = "user-bob";

    const { queryClient } = setup(storage);
    await tick(PERSIST_DELAY_MS);

    expect(server.requests).toHaveLength(0);
    expect(usePendingTasks.getState().byId).toEqual({});
    expect(storage.outbox.size).toBe(0);
    expect(queryClient.getQueryData(tasksKey)).toBeUndefined();
    const { snapshot } = await storage.load();
    expect(JSON.stringify(snapshot)).not.toContain("Alice");
  });

  it("prepares sign-out by syncing first, then forgetting this device's data", async () => {
    const { client, storage } = setup();
    await tick();
    usePendingTasks.getState().put(newTask("Book flights"));

    await expect(client.prepareSignOut()).resolves.toBe(true);
    expect(server.tasks.size).toBe(1);
    expect(storage.outbox.size).toBe(0);
    expect((await storage.load()).snapshot).toBeUndefined();
  });

  it("refuses to sign out while edits can't reach the server", async () => {
    vi.spyOn(api, "sync").mockRejectedValue(new TypeError("Failed to fetch"));
    const { client, storage } = setup();
    await tick();
    const task = newTask("Book flights");
    usePendingTasks.getState().put(task);

    await expect(client.prepareSignOut()).resolves.toBe(false);
    expect(storage.outbox.get(task.id)).toBe(task);
  });
});
