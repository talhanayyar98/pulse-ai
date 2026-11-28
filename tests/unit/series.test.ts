import { describe, expect, it } from "vitest";
import type { Recurrence } from "@/lib/domain/recurrence";
import { createdByCompletion, nextOccurrenceTask, projectOccurrences } from "@/lib/domain/series";
import { applyTaskPatch, createTask, type Task, taskSchema } from "@/lib/domain/task";
import { occurrenceId, seriesIdOf } from "@/lib/domain/task-id";

// Tests run in Europe/London. Wed 2 Dec 2026, 12:00.
const local = (month: number, day: number, hours = 0) => new Date(2026, month - 1, day, hours);
const now = local(12, 2, 12);
const MON = 1;
const WED = 3;
const THU = 4;

function recurring(recurrence: Recurrence, dueAt: Date, overrides: Partial<Task> = {}): Task {
  const base = createTask(
    { title: "Water the plants", labels: ["home"], priority: "high" },
    { id: crypto.randomUUID(), order: "a0", now: local(11, 1) },
  );
  return taskSchema.parse({
    ...base,
    dueAt: dueAt.toISOString(),
    recurrence,
    subtasks: [{ id: crypto.randomUUID(), title: "Check the soil", done: true }],
    ...overrides,
  });
}

const everyMonday: Recurrence = { freq: "weekly", interval: 1, byWeekday: [MON] };
const context = { now, order: "a5", weekStartsOn: 1 } as const;

describe("nextOccurrenceTask", () => {
  it("copies the task to the next date, back in To Do with subtasks unticked", () => {
    const task = recurring(everyMonday, local(11, 30, 9), { status: "in_progress" });
    const next = nextOccurrenceTask(task, context);

    expect(next).toMatchObject({
      id: `${task.id}:2026-12-07`,
      title: "Water the plants",
      labels: ["home"],
      priority: "high",
      recurrence: everyMonday,
      status: "todo",
      order: "a5",
      dueAt: local(12, 7, 9).toISOString(),
      completedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    expect(next?.subtasks.map((subtask) => subtask.done)).toEqual([false]);
  });

  it("keeps later occurrences in the first task's series", () => {
    const first = recurring(everyMonday, local(11, 30, 9));
    const second = nextOccurrenceTask(first, context);
    const third = second && nextOccurrenceTask(second, { ...context, now: local(12, 8) });
    expect(third?.id).toBe(`${first.id}:2026-12-14`);
    expect(seriesIdOf(third?.id ?? "")).toBe(first.id);
  });

  it("schedules a late task from today instead of creating overdue copies", () => {
    const task = recurring(everyMonday, local(11, 9, 9));
    expect(nextOccurrenceTask(task, context)?.dueAt).toBe(local(12, 7, 9).toISOString());
  });

  it("counts an all-day occurrence today as still on time", () => {
    const wednesdays: Recurrence = { freq: "weekly", interval: 1, byWeekday: [WED] };
    const allDay = recurring(wednesdays, local(11, 25), { allDay: true });
    expect(nextOccurrenceTask(allDay, context)?.dueAt).toBe(local(12, 2).toISOString());

    const at9 = recurring(wednesdays, local(11, 25, 9));
    expect(nextOccurrenceTask(at9, context)?.dueAt).toBe(local(12, 9, 9).toISOString());
  });

  it("returns null for a task that doesn't repeat", () => {
    const task = createTask({ title: "Once" }, { id: crypto.randomUUID(), order: "a0", now });
    expect(nextOccurrenceTask(task, context)).toBeNull();
  });
});

describe("createdByCompletion", () => {
  it("finds the occurrence a completion created until somebody edits it", () => {
    const task = recurring(everyMonday, local(11, 30, 9));
    const done = applyTaskPatch(task, { status: "done" }, now);
    const next = nextOccurrenceTask(done, context);
    if (!next) throw new Error("expected a next occurrence");

    expect(createdByCompletion(done, [done, next])).toBe(next);

    const edited = applyTaskPatch(next, { title: "Water the ferns" }, local(12, 2, 13));
    expect(createdByCompletion(done, [done, edited])).toBeUndefined();
  });

  it("ignores other series and open tasks", () => {
    const task = recurring(everyMonday, local(11, 30, 9));
    const done = applyTaskPatch(task, { status: "done" }, now);
    const other = recurring(everyMonday, local(12, 7, 9), { createdAt: now.toISOString() });
    expect(createdByCompletion(done, [done, { ...other, updatedAt: other.createdAt }])).toBe(
      undefined,
    );
    expect(createdByCompletion(task, [task])).toBeUndefined();
  });
});

describe("projectOccurrences", () => {
  const mondaysAndThursdays: Recurrence = { freq: "weekly", interval: 1, byWeekday: [MON, THU] };
  const nextWeek = { start: local(12, 7), end: local(12, 13, 23) };
  const dates = (tasks: Task[], range = nextWeek) =>
    projectOccurrences(tasks, range, now, 1).map(({ at }) => at.getDate());

  it("projects each open series into the range", () => {
    const task = recurring(mondaysAndThursdays, local(12, 3, 9));
    const projected = projectOccurrences([task], nextWeek, now, 1);
    expect(projected.map(({ at }) => at)).toEqual([local(12, 7, 9), local(12, 10, 9)]);
    expect(projected.every((item) => item.task === task)).toBe(true);
  });

  it("projects nothing for a completed occurrence", () => {
    expect(dates([recurring(mondaysAndThursdays, local(12, 3, 9), { status: "done" })])).toEqual(
      [],
    );
  });

  it("leaves out days where the series already has a real task", () => {
    const task = recurring(mondaysAndThursdays, local(12, 3, 9));
    const created = {
      ...task,
      id: occurrenceId(task.id, local(12, 7)),
      dueAt: local(12, 7, 9).toISOString(),
      status: "done" as const,
    };
    expect(dates([task, created])).toEqual([10]);
  });

  it("projects from the latest open occurrence when a series has several", () => {
    const task = recurring(mondaysAndThursdays, local(12, 3, 9));
    const moved = {
      ...task,
      id: occurrenceId(task.id, local(12, 8)),
      dueAt: local(12, 8, 9).toISOString(),
    };
    expect(dates([task, moved])).toEqual([10]);
  });

  it("never projects into the past", () => {
    const task = recurring(everyMonday, local(11, 16, 9));
    expect(dates([task], { start: local(11, 23), end: local(11, 29, 23) })).toEqual([]);
    expect(dates([task])).toEqual([7]);
  });
});
