import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDb } from "@/lib/db/connect";
import { ActivityEventModel } from "@/lib/db/models/activity-event";
import { TaskModel } from "@/lib/db/models/task";
import { applyTaskPatch, createTask, markTaskDeleted, type Task } from "@/lib/domain/task";
import { HttpError } from "@/lib/server/errors";
import { listTasks, putTask } from "@/lib/server/task-service";

const alice = "user-alice";
const bob = "user-bob";
const t0 = new Date("2026-12-01T09:00:00.000Z");
const serverNow = new Date("2026-12-01T12:00:00.000Z");
const minutes = (n: number) => new Date(t0.getTime() + n * 60_000);

function newTask(title = "Book flights"): Task {
  return createTask({ title }, { id: crypto.randomUUID(), order: "a0", now: t0 });
}

beforeAll(async () => {
  await connectDb();
  await Promise.all([TaskModel.init(), ActivityEventModel.init()]);
});

beforeEach(async () => {
  await Promise.all([TaskModel.deleteMany({}), ActivityEventModel.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("putTask", () => {
  it("stores a new task and logs its creation", async () => {
    const task = newTask();
    await expect(putTask(alice, task, serverNow)).resolves.toEqual({ status: "applied", task });
    await expect(listTasks(alice)).resolves.toEqual([task]);
    const events = await ActivityEventModel.find({ taskId: task.id }).lean();
    expect(events.map((event) => event.type)).toEqual(["created"]);
  });

  it("keeps the newest snapshot when an older one arrives late (last-write-wins)", async () => {
    const original = newTask();
    const newer = applyTaskPatch(original, { title: "Book flights to Lisbon" }, minutes(10));
    const older = applyTaskPatch(original, { title: "Book trains" }, minutes(5));

    await putTask(alice, original, serverNow);
    await putTask(alice, newer, serverNow);
    const result = await putTask(alice, older, serverNow);

    expect(result).toEqual({ status: "stale", task: newer });
    expect((await listTasks(alice))[0]?.title).toBe("Book flights to Lisbon");
  });

  it("treats a replayed snapshot as a no-op", async () => {
    const task = newTask();
    await putTask(alice, task, serverNow);
    await expect(putTask(alice, task, serverNow)).resolves.toMatchObject({ status: "stale" });
    expect(await ActivityEventModel.countDocuments({ taskId: task.id })).toBe(1);
  });

  it("clamps timestamps from a fast client clock to server time", async () => {
    const future = createTask(
      { title: "From the future" },
      { id: crypto.randomUUID(), order: "a0", now: new Date("2030-01-01T00:00:00.000Z") },
    );
    const { task } = await putTask(alice, future, serverNow);
    expect(task.updatedAt).toBe(serverNow.toISOString());
    expect(task.createdAt).toBe(serverNow.toISOString());
  });

  it("refuses to overwrite another user's task, without revealing it exists", async () => {
    const task = newTask();
    await putTask(alice, task, serverNow);
    const hijack = applyTaskPatch(task, { title: "Mine now" }, minutes(1));
    const error = await putTask(bob, hijack, serverNow).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 404 });
  });

  it("hides soft-deleted tasks and logs the deletion", async () => {
    const task = newTask();
    await putTask(alice, task, serverNow);
    await putTask(alice, markTaskDeleted(task, minutes(1)), serverNow);
    await expect(listTasks(alice)).resolves.toEqual([]);
    const types = (await ActivityEventModel.find({ taskId: task.id }).lean()).map((e) => e.type);
    expect(types).toEqual(["created", "deleted"]);
  });

  it("settles concurrent writes on the newest version", async () => {
    const original = newTask();
    await putTask(alice, original, serverNow);
    const versions = [3, 1, 5, 2, 4].map((n) =>
      applyTaskPatch(original, { title: `Version ${n}` }, minutes(n)),
    );

    await Promise.all(versions.map((version) => putTask(alice, version, serverNow)));

    expect((await listTasks(alice))[0]?.title).toBe("Version 5");
  });
});
