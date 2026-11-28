import { ApiError } from "@/lib/client/api";
import type { SyncResponse, TaskPutOp } from "@/lib/domain/sync";
import type { Task } from "@/lib/domain/task";

/** The most ops /api/sync accepts in one request. */
export const MAX_BATCH = 100;
const RETRY_FIRST_MS = 1_000;
const RETRY_MAX_MS = 30_000;

/**
 * - idle: nothing to send, or offline (the online event starts it again);
 * - syncing: a request is on its way;
 * - retrying: the last attempt failed (network or server); another is scheduled;
 * - signed-out: the server no longer accepts this session; edits wait for a sign-in.
 */
export type SyncPhase = "idle" | "syncing" | "retrying" | "signed-out";

export interface SyncEngineOptions {
  /** The outbox: unconfirmed snapshots, the newest per task, as the very objects to settle. */
  pending: () => readonly Task[];
  /** The server has answered for `task`: stop treating it as unsaved (unless edited since). */
  settle: (task: Task) => void;
  send: (ops: TaskPutOp[]) => Promise<SyncResponse>;
  /** Resolves true when a session confirmed by the server owns the outbox. */
  verifyUser: () => Promise<boolean>;
  /** The server's copies after a write. Called before the sent snapshots are settled. */
  adopt: (tasks: Task[]) => Promise<void>;
  /** The server already had newer versions of these, edited elsewhere after ours. */
  onOverridden: (tasks: Task[]) => void;
  /** The server refused this snapshot outright (it can never succeed); it was dropped. */
  onRejected: (task: Task) => void;
  /** A request was answered 401: the session ended. */
  onSignedOut: () => void;
  isOnline: () => boolean;
}

/** 401 means signed out; these mean "try again later"; any other 4xx will never succeed. */
const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([408, 409, 425, 429]);

function isRejection(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 401 &&
    !RETRYABLE_STATUSES.has(error.status)
  );
}

/**
 * Replays the outbox to the server, one request at a time. Every op is a full snapshot and the
 * server keeps the newest updatedAt, so resending after a lost response is harmless. Edits made
 * while a request is in flight go out in the next one.
 */
export class SyncEngine {
  readonly #options: SyncEngineOptions;
  readonly #listeners = new Set<() => void>();
  #phase: SyncPhase = "idle";
  #timer: ReturnType<typeof setTimeout> | undefined;
  #running: Promise<void> | undefined;
  #failures = 0;
  #stopped = false;

  constructor(options: SyncEngineOptions) {
    this.#options = options;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  getPhase = (): SyncPhase => this.#phase;

  /**
   * Sends the outbox on the next tick, so edits made together (completing a repeat creates the
   * next one) share a request. Does nothing while a retry is already scheduled.
   */
  schedule(): void {
    if (this.#stopped || this.#running || this.#timer !== undefined) return;
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      this.#start();
    }, 0);
  }

  /** Tries again now, forgetting the backoff (back online, or the user asked). */
  retryNow(): void {
    clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#failures = 0;
    this.schedule();
  }

  /** Sends everything right away; resolves with the number of tasks still unsynced. */
  async drain(): Promise<number> {
    await this.#running;
    if (this.#options.pending().length > 0) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
      this.#start();
      await this.#running;
    }
    return this.#options.pending().length;
  }

  /** Stops for good (signing out). */
  stop(): void {
    this.#stopped = true;
    clearTimeout(this.#timer);
    this.#timer = undefined;
  }

  #start(): void {
    if (this.#stopped || this.#running) return;
    // Cleared by the promise, not inside the loop: a loop that returns before its first await
    // would otherwise finish before it is even stored.
    const run = this.#loop().finally(() => {
      if (this.#running === run) this.#running = undefined;
    });
    this.#running = run;
  }

  async #loop(): Promise<void> {
    try {
      while (!this.#stopped) {
        if (this.#options.pending().length === 0 || !this.#options.isOnline()) {
          this.#setPhase("idle");
          return;
        }
        this.#setPhase("syncing");
        if (!(await this.#options.verifyUser())) {
          this.#setPhase("signed-out");
          return;
        }
        // Read after verifying: switching accounts empties the outbox.
        const batch = this.#options.pending().slice(0, MAX_BATCH);
        if (batch.length > 0) await this.#send(batch);
        this.#failures = 0;
      }
    } catch (error) {
      this.#fail(error);
    }
  }

  async #send(batch: readonly Task[]): Promise<void> {
    const ops = batch.map((task) => ({
      opId: crypto.randomUUID(),
      type: "task.put" as const,
      task,
    }));
    let response: SyncResponse;
    try {
      response = await this.#options.send(ops);
    } catch (error) {
      if (!isRejection(error)) throw error;
      // One bad snapshot fails the whole request; send them one by one to find it.
      if (batch.length > 1) {
        for (const task of batch) await this.#send([task]);
        return;
      }
      for (const task of batch) {
        this.#options.settle(task);
        this.#options.onRejected(task);
      }
      return;
    }

    await this.#options.adopt(response.results.map((result) => result.task));
    const sent = new Map(ops.map((op) => [op.opId, op.task]));
    const overridden = response.results.filter((result) => {
      const ours = sent.get(result.opId);
      return (
        result.status === "stale" &&
        ours !== undefined &&
        Date.parse(result.task.updatedAt) > Date.parse(ours.updatedAt)
      );
    });
    // Settle everything sent, even an op the server left unanswered: resending can't help.
    for (const task of batch) this.#options.settle(task);
    if (overridden.length > 0) this.#options.onOverridden(overridden.map(({ task }) => task));
  }

  #fail(error: unknown): void {
    if (error instanceof ApiError && error.status === 401) {
      this.#setPhase("signed-out");
      this.#options.onSignedOut();
      return;
    }
    this.#failures += 1;
    this.#setPhase("retrying");
    const delay = Math.min(RETRY_MAX_MS, RETRY_FIRST_MS * 2 ** (this.#failures - 1));
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      this.#start();
    }, delay);
  }

  #setPhase(phase: SyncPhase): void {
    if (phase === this.#phase) return;
    this.#phase = phase;
    for (const listener of this.#listeners) listener();
  }
}
