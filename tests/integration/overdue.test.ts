import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDb } from "@/lib/db/connect";
import { ActivityEventModel } from "@/lib/db/models/activity-event";
import { ReminderModel } from "@/lib/db/models/reminder";
import { TaskModel } from "@/lib/db/models/task";
import { applyTaskPatch, createTask, markTaskDeleted, type Task } from "@/lib/domain/task";
import { sweepOverdue } from "@/lib/server/overdue";
import { putTask } from "@/lib/server/task-service";

const alice = "user-alice";
const t0 = new Date("2026-12-01T08:00:00.000Z");

function dueTask(dueAt: string, allDay = false): Task {
  return createTask(
    { title: "File the report", due: { dueAt, allDay } },
    { id: crypto.randomUUID(), order: "a0", now: t0 },
  );
}

const overdueEvents = async () =>
  (await ActivityEventModel.find({ type: "overdue" }).sort({ at: 1 }).lean()).map(
    ({ taskId, payload, at }) => ({ taskId, payload, at: at.toISOString() }),
  );

beforeAll(async () => {
  await connectDb();
  await Promise.all([ActivityEventModel.init(), TaskModel.init()]);
});

beforeEach(async () => {
  await Promise.all([
    ActivityEventModel.deleteMany({}),
    TaskModel.deleteMany({}),
    ReminderModel.deleteMany({}),
  ]);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("sweepOverdue", () => {
  it("logs a missed deadline once, however often it runs", async () => {
    const task = dueTask("2026-12-01T11:00:00.000Z");
    await putTask(alice, task, t0);

    await expect(sweepOverdue(new Date("2026-12-01T10:59:00.000Z"))).resolves.toBe(0);
    await expect(sweepOverdue(new Date("2026-12-01T11:01:00.000Z"))).resolves.toBe(1);
    await expect(sweepOverdue(new Date("2026-12-01T11:02:00.000Z"))).resolves.toBe(0);
    await expect(overdueEvents()).resolves.toEqual([
      {
        taskId: task.id,
        payload: { dueAt: "2026-12-01T11:00:00.000Z" },
        at: "2026-12-01T11:00:00.000Z",
      },
    ]);
  });

  it("counts an all-day task as overdue once its day is over", async () => {
    await putTask(alice, dueTask("2026-12-01T00:00:00.000Z", true), t0);
    await expect(sweepOverdue(new Date("2026-12-01T23:59:00.000Z"))).resolves.toBe(0);
    await expect(sweepOverdue(new Date("2026-12-02T00:00:01.000Z"))).resolves.toBe(1);
    const [event] = await overdueEvents();
    expect(event?.at).toBe("2026-12-01T23:59:59.999Z");
  });

  it("logs each due date a rescheduled task misses", async () => {
    const task = dueTask("2026-12-01T11:00:00.000Z");
    await putTask(alice, task, t0);
    await sweepOverdue(new Date("2026-12-01T11:01:00.000Z"));

    const moved = applyTaskPatch(task, { dueAt: "2026-12-01T15:00:00.000Z" }, t0);
    await putTask(alice, moved, new Date("2026-12-01T11:05:00.000Z"));
    await expect(sweepOverdue(new Date("2026-12-01T15:01:00.000Z"))).resolves.toBe(1);
    await expect(overdueEvents()).resolves.toHaveLength(2);
  });

  it("ignores finished and deleted tasks", async () => {
    const done = dueTask("2026-12-01T11:00:00.000Z");
    const deleted = dueTask("2026-12-01T11:00:00.000Z");
    await putTask(alice, applyTaskPatch(done, { status: "done" }, t0), t0);
    await putTask(alice, markTaskDeleted(deleted, t0), t0);
    await expect(sweepOverdue(new Date("2026-12-01T12:00:00.000Z"))).resolves.toBe(0);
  });
});
