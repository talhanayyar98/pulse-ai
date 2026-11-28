import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/client/api";
import { MAX_BATCH, SyncEngine, type SyncEngineOptions } from "@/lib/client/offline/sync-engine";
import type { TaskPutOp } from "@/lib/domain/sync";
import { applyTaskPatch, createTask, type Task } from "@/lib/domain/task";
import { createFakeSyncServer } from "../support/fake-sync-server";

const t0 = new Date("2026-12-01T09:00:00.000Z");

function newTask(title: string): Task {
  return createTask({ title }, { id: crypto.randomUUID(), order: "a0", now: t0 });
}

/** An engine over an in-memory outbox and a fake server, recording what it reports. */
function setup(overrides: Partial<SyncEngineOptions> = {}) {
  const server = createFakeSyncServer();
  const outbox = new Map<string, Task>();
  const adopted: Task[] = [];
  const overridden: Task[][] = [];
  const rejected: Task[] = [];
  const signedOut = vi.fn();
  let online = true;

  const engine = new SyncEngine({
    pending: () => [...outbox.values()],
    settle: (task) => {
      if (outbox.get(task.id) === task) outbox.delete(task.id);
    },
    send: vi.fn(server.sync),
    verifyUser: async () => true,
    adopt: async (tasks) => {
      adopted.push(...tasks);
    },
    onOverridden: (tasks) => overridden.push(tasks),
    onRejected: (task) => rejected.push(task),
    onSignedOut: signedOut,
    isOnline: () => online,
    ...overrides,
  });

  return {
    engine,
    server,
    outbox,
    adopted,
    overridden,
    rejected,
    signedOut,
    setOnline: (value: boolean) => {
      online = value;
    },
    /** Queues an edit the way the app does: into the outbox, then a nudge. */
    edit(task: Task) {
      outbox.set(task.id, task);
      engine.schedule();
    },
  };
}

/** Runs due timers and lets the engine's promise chain finish. */
const tick = (ms = 0) => vi.advanceTimersByTimeAsync(ms);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SyncEngine", () => {
  it("sends edits made together in one request and settles them", async () => {
    const { engine, server, outbox, edit } = setup();
    edit(newTask("Book flights"));
    edit(newTask("Renew passport"));
    expect(engine.getPhase()).toBe("idle");

    await tick();

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0]?.map((op) => op.task.title)).toEqual([
      "Book flights",
      "Renew passport",
    ]);
    expect(outbox.size).toBe(0);
    expect(engine.getPhase()).toBe("idle");
  });

  it("adopts the server's copies before settling, so the screen never shows the old version", async () => {
    const order: string[] = [];
    const { outbox, edit } = setup({
      adopt: async () => {
        order.push(`adopt (outbox ${outbox.size})`);
      },
    });
    edit(newTask("Book flights"));
    await tick();
    expect(order).toEqual(["adopt (outbox 1)"]);
    expect(outbox.size).toBe(0);
  });

  it("sends an edit made while a request is in flight in the next request", async () => {
    let release: () => void = () => undefined;
    const server = createFakeSyncServer();
    const send = vi.fn(async (ops: TaskPutOp[]) => {
      if (server.requests.length === 0) await new Promise<void>((r) => (release = r));
      return server.sync(ops);
    });
    const { outbox, edit } = setup({ send });

    const task = newTask("Book flights");
    edit(task);
    await tick();
    expect(send).toHaveBeenCalledTimes(1);

    // Edited again before the first request is answered: kept, then sent on its own.
    const renamed = applyTaskPatch(
      task,
      { title: "Book flights to Lisbon" },
      new Date(t0.getTime() + 1),
    );
    edit(renamed);
    release();
    await tick();

    expect(server.requests.map((ops) => ops.map((op) => op.task.title))).toEqual([
      ["Book flights"],
      ["Book flights to Lisbon"],
    ]);
    expect(outbox.size).toBe(0);
  });

  it("splits a large outbox into requests the server accepts", async () => {
    const { server, outbox, edit } = setup();
    for (let i = 0; i < MAX_BATCH + 5; i++) edit(newTask(`Task ${i}`));
    await tick();
    expect(server.requests.map((ops) => ops.length)).toEqual([MAX_BATCH, 5]);
    expect(outbox.size).toBe(0);
  });

  it("waits while offline, then sends when retried", async () => {
    const { engine, server, outbox, setOnline, edit } = setup();
    setOnline(false);
    edit(newTask("Book flights"));
    await tick();
    expect(server.requests).toHaveLength(0);
    expect(outbox.size).toBe(1);

    setOnline(true);
    engine.retryNow();
    await tick();
    expect(server.requests).toHaveLength(1);
    expect(outbox.size).toBe(0);
  });

  it("backs off after a network failure; new edits don't cut the wait short", async () => {
    const server = createFakeSyncServer();
    let failures = 2;
    const send = vi.fn(async (ops: TaskPutOp[]) => {
      if (failures-- > 0) throw new TypeError("Failed to fetch");
      return server.sync(ops);
    });
    const { engine, outbox, edit } = setup({ send });

    edit(newTask("Book flights"));
    await tick();
    expect(engine.getPhase()).toBe("retrying");
    expect(send).toHaveBeenCalledTimes(1);

    edit(newTask("Renew passport"));
    await tick(999);
    expect(send).toHaveBeenCalledTimes(1);
    await tick(1);
    expect(send).toHaveBeenCalledTimes(2);

    // The second failure doubles the wait.
    await tick(1_999);
    expect(send).toHaveBeenCalledTimes(2);
    await tick(1);
    expect(send).toHaveBeenCalledTimes(3);
    expect(outbox.size).toBe(0);
    expect(engine.getPhase()).toBe("idle");
  });

  it("retries at once when asked, forgetting the backoff", async () => {
    let fail = true;
    const server = createFakeSyncServer();
    const send = vi.fn(async (ops: TaskPutOp[]) => {
      if (fail) throw new ApiError(503, "Service Unavailable");
      return server.sync(ops);
    });
    const { engine, outbox, edit } = setup({ send });
    edit(newTask("Book flights"));
    await tick();
    expect(engine.getPhase()).toBe("retrying");

    fail = false;
    engine.retryNow();
    await tick();
    expect(outbox.size).toBe(0);
  });

  it("stops on 401 and keeps the outbox until it is told to retry", async () => {
    let signedIn = false;
    const server = createFakeSyncServer();
    const send = vi.fn(async (ops: TaskPutOp[]) => {
      if (!signedIn) throw new ApiError(401, "Not signed in");
      return server.sync(ops);
    });
    const { engine, outbox, signedOut, edit } = setup({ send });

    edit(newTask("Book flights"));
    await tick(60_000);
    expect(engine.getPhase()).toBe("signed-out");
    expect(signedOut).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(outbox.size).toBe(1);

    signedIn = true;
    engine.retryNow();
    await tick();
    expect(outbox.size).toBe(0);
  });

  it("sends nothing until a session is confirmed", async () => {
    let verified = false;
    const { engine, server, outbox, edit } = setup({ verifyUser: async () => verified });
    edit(newTask("Book flights"));
    await tick();
    expect(engine.getPhase()).toBe("signed-out");
    expect(server.requests).toHaveLength(0);

    verified = true;
    engine.retryNow();
    await tick();
    expect(outbox.size).toBe(0);
  });

  it("drops a snapshot the server refuses, and still saves the rest of its batch", async () => {
    const server = createFakeSyncServer();
    const bad = newTask("Not mine");
    const send = vi.fn(async (ops: TaskPutOp[]) => {
      if (ops.some((op) => op.task.id === bad.id)) throw new ApiError(404, "Task not found");
      return server.sync(ops);
    });
    const { engine, outbox, rejected, edit } = setup({ send });
    const good = [newTask("Book flights"), newTask("Renew passport")];

    edit(good[0] as Task);
    edit(bad);
    edit(good[1] as Task);
    await tick();

    expect([...server.tasks.values()].map((task) => task.title).sort()).toEqual([
      "Book flights",
      "Renew passport",
    ]);
    expect(rejected).toEqual([bad]);
    expect(outbox.size).toBe(0);
    expect(engine.getPhase()).toBe("idle");
  });

  it("reports edits that lost to newer ones made elsewhere, but not its own replays", async () => {
    const { server, overridden, outbox, edit } = setup();
    const mine = newTask("Book flights");
    const theirs = applyTaskPatch(mine, { title: "Book trains" }, new Date(t0.getTime() + 60_000));
    server.tasks.set(theirs.id, theirs);
    const replayed = newTask("Renew passport");
    server.tasks.set(replayed.id, replayed);

    edit(mine);
    edit(replayed);
    await tick();

    expect(overridden).toEqual([[theirs]]);
    expect(outbox.size).toBe(0);
  });

  it("drain sends everything now and reports what couldn't be sent", async () => {
    let fail = false;
    const server = createFakeSyncServer();
    const send = vi.fn(async (ops: TaskPutOp[]) => {
      if (fail) throw new TypeError("Failed to fetch");
      return server.sync(ops);
    });
    const { engine, outbox } = setup({ send });

    const first = newTask("Book flights");
    outbox.set(first.id, first);
    expect(await engine.drain()).toBe(0);

    fail = true;
    const task = newTask("Renew passport");
    outbox.set(task.id, task);
    expect(await engine.drain()).toBe(1);
  });

  it("stays quiet once stopped", async () => {
    const { engine, server, edit } = setup();
    engine.stop();
    edit(newTask("Book flights"));
    await tick();
    expect(server.requests).toHaveLength(0);
  });
});
