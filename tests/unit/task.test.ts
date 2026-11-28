import { describe, expect, it } from "vitest";
import {
  applyTaskPatch,
  createTask,
  markTaskDeleted,
  normalizeLabels,
  orderAtIndex,
  orderAtTopOf,
  type Task,
  taskSchema,
} from "@/lib/domain/task";

const T0 = new Date("2026-12-01T09:00:00.000Z");
const T1 = new Date("2026-12-01T10:00:00.000Z");

function makeTask(overrides: Partial<Parameters<typeof createTask>[0]> = {}): Task {
  return createTask(
    { title: "Write the plan", ...overrides },
    { id: crypto.randomUUID(), order: "a0", now: T0 },
  );
}

describe("createTask", () => {
  it("fills defaults and stamps every timestamp with the creation time", () => {
    const task = makeTask();
    expect(task).toMatchObject({
      title: "Write the plan",
      status: "todo",
      priority: "medium",
      horizon: "none",
      labels: [],
      subtasks: [],
      dueAt: null,
      completedAt: null,
      deletedAt: null,
      createdAt: T0.toISOString(),
      updatedAt: T0.toISOString(),
      statusChangedAt: T0.toISOString(),
    });
  });

  it("takes a due date from the draft (quick add on a calendar day)", () => {
    const due = { dueAt: "2026-12-07T00:00:00.000Z", allDay: true };
    expect(makeTask({ due })).toMatchObject(due);
  });

  it("rejects an empty title", () => {
    expect(() => makeTask({ title: "   " })).toThrow();
  });
});

describe("applyTaskPatch", () => {
  it("sets completedAt and statusChangedAt when moving to done", () => {
    const done = applyTaskPatch(makeTask(), { status: "done" }, T1);
    expect(done.completedAt).toBe(T1.toISOString());
    expect(done.statusChangedAt).toBe(T1.toISOString());
  });

  it("clears completedAt when reopened", () => {
    const done = applyTaskPatch(makeTask(), { status: "done" }, T1);
    const reopened = applyTaskPatch(done, { status: "in_progress" }, T1);
    expect(reopened.completedAt).toBeNull();
  });

  it("leaves statusChangedAt alone when the status does not change", () => {
    const renamed = applyTaskPatch(makeTask(), { title: "Renamed" }, T1);
    expect(renamed.statusChangedAt).toBe(T0.toISOString());
  });

  it("always moves updatedAt forward, even within the same millisecond", () => {
    const first = applyTaskPatch(makeTask(), { title: "One" }, T1);
    const second = applyTaskPatch(first, { title: "Two" }, T1);
    expect(Date.parse(second.updatedAt)).toBeGreaterThan(Date.parse(first.updatedAt));
  });
});

describe("recurrence", () => {
  const everyMonday = { freq: "weekly", interval: 1, byWeekday: [1] } as const;
  const repeating = () =>
    applyTaskPatch(
      makeTask(),
      { dueAt: "2026-12-07T09:00:00.000Z", recurrence: { ...everyMonday, byWeekday: [1] } },
      T1,
    );

  it("ends the repeat when the due date is cleared", () => {
    const cleared = applyTaskPatch(repeating(), { dueAt: null, allDay: false }, T1);
    expect(cleared.recurrence).toBeNull();
  });

  it("refuses a repeating task without a due date", () => {
    const task = { ...repeating(), dueAt: null };
    expect(taskSchema.safeParse(task).success).toBe(false);
  });

  it("reads a snapshot from before reminders existed as using the default reminders", () => {
    const { reminders: _omitted, ...legacy } = makeTask();
    expect(taskSchema.parse(legacy).reminders).toBeNull();
  });

  it("allows at most five reminders, each with its own id", () => {
    const rule = () => ({ id: crypto.randomUUID(), kind: "offset", amount: 1, unit: "days" });
    expect(taskSchema.safeParse({ ...makeTask(), reminders: [rule(), rule()] }).success).toBe(true);
    const six = Array.from({ length: 6 }, rule);
    expect(taskSchema.safeParse({ ...makeTask(), reminders: six }).success).toBe(false);
    const twin = rule();
    expect(taskSchema.safeParse({ ...makeTask(), reminders: [twin, twin] }).success).toBe(false);
  });

  it("reads a snapshot from before recurrence existed as not repeating", () => {
    const { recurrence: _omitted, ...legacy } = makeTask();
    expect(taskSchema.parse(legacy).recurrence).toBeNull();
  });
});

describe("task ids", () => {
  it("accepts random UUIDs and occurrence ids, nothing else", () => {
    const id = crypto.randomUUID();
    const valid = (candidate: string) => taskSchema.safeParse({ ...makeTask(), id: candidate });
    expect(valid(id).success).toBe(true);
    expect(valid(`${id}:2026-12-07`).success).toBe(true);
    expect(valid(`${id}:next-week`).success).toBe(false);
    expect(valid("task-1").success).toBe(false);
  });
});

describe("markTaskDeleted", () => {
  it("sets deletedAt to the new updatedAt", () => {
    const deleted = markTaskDeleted(makeTask(), T1);
    expect(deleted.deletedAt).toBe(T1.toISOString());
    expect(deleted.updatedAt).toBe(T1.toISOString());
  });
});

describe("normalizeLabels", () => {
  it("trims, collapses whitespace and drops case-insensitive duplicates", () => {
    expect(normalizeLabels([" Home ", "home", "deep   work", "", "Deep Work"])).toEqual([
      "Home",
      "deep work",
    ]);
  });
});

describe("orderAtTopOf", () => {
  it("places new tasks above the current first task of that column only", () => {
    const todo = { ...makeTask(), order: "a5" };
    const backlog = { ...makeTask({ status: "backlog" }), order: "a0" };
    const key = orderAtTopOf([todo, backlog], "todo");
    expect(key < "a5").toBe(true);
    expect(orderAtTopOf([], "todo")).toBe("a0");
  });
});

describe("orderAtIndex", () => {
  const column = ["a0", "a1", "a2"].map((order) => ({ ...makeTask(), order }));

  it("produces a key that sorts into the requested slot", () => {
    expect(orderAtIndex(column, 0) < "a0").toBe(true);
    const middle = orderAtIndex(column, 1);
    expect("a0" < middle && middle < "a1").toBe(true);
    expect(orderAtIndex(column, 3) > "a2").toBe(true);
  });

  it("handles an empty column", () => {
    expect(orderAtIndex([], 0)).toBe("a0");
  });
});
