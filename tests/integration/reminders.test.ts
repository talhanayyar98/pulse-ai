import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDb } from "@/lib/db/connect";
import { ActivityEventModel } from "@/lib/db/models/activity-event";
import { ReminderModel } from "@/lib/db/models/reminder";
import { TaskModel } from "@/lib/db/models/task";
import { UserModel } from "@/lib/db/models/user";
import type { OffsetReminder } from "@/lib/domain/reminders";
import { DEFAULT_SETTINGS } from "@/lib/domain/settings";
import { applyTaskPatch, createTask, markTaskDeleted, type Task } from "@/lib/domain/task";
import { scheduleTaskReminders } from "@/lib/server/reminders";
import { reminderPolicyFor, saveSettings } from "@/lib/server/settings";
import { putTask } from "@/lib/server/task-service";
import { upsertUserForAccount } from "@/lib/server/users";

const alice = "user-alice";
const at = (time: string, day = "2026-12-01") => new Date(`${day}T${time}:00.000Z`);
const t0 = at("11:00");

const offset = (amount: number, unit: OffsetReminder["unit"]): OffsetReminder => ({
  id: crypto.randomUUID(),
  kind: "offset",
  amount,
  unit,
});

/** A task due at `dueAt`, written at t0 unless `editedAt` says otherwise. */
function dueTask(dueAt: Date, overrides: Partial<Task> = {}, editedAt = t0): Task {
  const task = createTask(
    { title: "Pick up the keys", due: { dueAt: dueAt.toISOString(), allDay: false } },
    { id: crypto.randomUUID(), order: "a0", now: editedAt },
  );
  return { ...task, ...overrides };
}

async function remindersOf(taskId: string) {
  const docs = await ReminderModel.find({ taskId }).sort({ fireAt: 1 }).lean();
  return docs.map(({ state, fireAt }) => ({ state, fireAt: fireAt.toISOString() }));
}

const pendingAt = (date: Date) => ({ state: "pending", fireAt: date.toISOString() });

beforeAll(async () => {
  await connectDb();
  await Promise.all([ReminderModel.init(), TaskModel.init(), UserModel.init()]);
});

beforeEach(async () => {
  await Promise.all([
    ReminderModel.deleteMany({}),
    TaskModel.deleteMany({}),
    ActivityEventModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("reminder scheduling", () => {
  it("gives a task with a due date the default reminder, one hour before", async () => {
    const task = dueTask(at("09:00", "2026-12-03"));
    await putTask(alice, task, t0);
    await expect(remindersOf(task.id)).resolves.toEqual([pendingAt(at("08:00", "2026-12-03"))]);
  });

  it("moves the reminder with the due date", async () => {
    const task = dueTask(at("09:00", "2026-12-03"));
    await putTask(alice, task, t0);
    const moved = applyTaskPatch(task, { dueAt: at("15:00", "2026-12-04").toISOString() }, t0);
    await putTask(alice, moved, t0);
    await expect(remindersOf(task.id)).resolves.toEqual([pendingAt(at("14:00", "2026-12-04"))]);
  });

  it("schedules each of the task's own reminders, and none for an empty list", async () => {
    const task = dueTask(at("09:00", "2026-12-03"), {
      reminders: [
        offset(1, "days"),
        { id: crypto.randomUUID(), kind: "absolute", at: at("20:00").toISOString() },
      ],
    });
    await putTask(alice, task, t0);
    await expect(remindersOf(task.id)).resolves.toEqual([
      pendingAt(at("20:00")),
      pendingAt(at("09:00", "2026-12-02")),
    ]);

    await putTask(alice, applyTaskPatch(task, { reminders: [] }, t0), t0);
    await expect(remindersOf(task.id)).resolves.toEqual([]);
  });

  it("drops pending reminders when the task is completed or deleted", async () => {
    const done = dueTask(at("09:00", "2026-12-03"));
    const deleted = dueTask(at("10:00", "2026-12-03"));
    await putTask(alice, done, t0);
    await putTask(alice, deleted, t0);

    await putTask(alice, applyTaskPatch(done, { status: "done" }, t0), t0);
    await putTask(alice, markTaskDeleted(deleted, t0), t0);
    await expect(ReminderModel.countDocuments()).resolves.toBe(0);
  });

  it("keeps sent reminders as history", async () => {
    const task = dueTask(at("12:00"), { reminders: [offset(30, "minutes")] });
    await putTask(alice, task, t0);
    await ReminderModel.updateMany({ taskId: task.id }, { state: "sent", sentAt: at("11:30") });

    const moved = applyTaskPatch(task, { dueAt: at("18:00").toISOString() }, at("11:45"));
    await putTask(alice, moved, at("11:45"));
    await expect(remindersOf(task.id)).resolves.toEqual([
      { state: "sent", fireAt: at("11:30").toISOString() },
      pendingAt(at("17:30")),
    ]);
  });

  it("leaves a reminder whose time has come for the dispatcher to check", async () => {
    const hourBefore = offset(1, "hours");
    const task = dueTask(at("12:30"), { reminders: [hourBefore] });
    await putTask(alice, task, t0);

    // A second reminder is added a minute after the first one was due, before it was sent.
    const later = at("11:31");
    await putTask(
      alice,
      applyTaskPatch(task, { reminders: [hourBefore, offset(15, "minutes")] }, later),
      later,
    );
    await expect(remindersOf(task.id)).resolves.toEqual([
      pendingAt(at("11:30")),
      pendingAt(at("12:15")),
    ]);
  });

  it("still reminds of an edit made offline before the reminder time but synced after it", async () => {
    const task = dueTask(at("12:15"));
    await putTask(alice, task, at("11:40"));
    await expect(remindersOf(task.id)).resolves.toEqual([pendingAt(at("11:15"))]);
  });

  it("doesn't fire a reminder whose time had already passed when it was set", async () => {
    const task = dueTask(at("11:30"));
    await putTask(alice, task, t0);
    await expect(remindersOf(task.id)).resolves.toEqual([]);
  });

  it("can't be undone by an older recalculation that finishes late", async () => {
    const v1 = dueTask(at("09:00", "2026-12-03"));
    const v2 = applyTaskPatch(v1, { dueAt: at("09:00", "2026-12-04").toISOString() }, at("11:05"));
    await putTask(alice, v1, t0);
    await putTask(alice, v2, at("11:05"));

    await scheduleTaskReminders(alice, v1, await reminderPolicyFor(alice), {
      changedAt: t0,
      now: at("11:06"),
    });
    const reminders = await remindersOf(v1.id);
    expect(reminders).toContainEqual(pendingAt(at("08:00", "2026-12-04")));
  });
});

describe("reminder settings", () => {
  let userId = "";

  beforeEach(async () => {
    userId = await upsertUserForAccount({
      provider: "google",
      providerAccountId: "7",
      email: null,
      name: "Ada",
      image: null,
    });
  });

  it("reschedules tasks that use the default when the default changes", async () => {
    const onDefault = dueTask(at("09:00", "2026-12-03"));
    const ownReminders = dueTask(at("09:00", "2026-12-03"), { reminders: [offset(5, "minutes")] });
    await putTask(userId, onDefault, t0);
    await putTask(userId, ownReminders, t0);

    await saveSettings(userId, { ...DEFAULT_SETTINGS, defaultReminders: [offset(1, "days")] }, t0);
    await expect(remindersOf(onDefault.id)).resolves.toEqual([
      pendingAt(at("09:00", "2026-12-02")),
    ]);
    await expect(remindersOf(ownReminders.id)).resolves.toEqual([
      pendingAt(at("08:55", "2026-12-03")),
    ]);
  });

  it("doesn't send a reminder late because a new default put it in the past", async () => {
    const task = dueTask(at("09:00", "2026-12-02"));
    await putTask(userId, task, t0);
    await saveSettings(userId, { ...DEFAULT_SETTINGS, defaultReminders: [offset(1, "days")] }, t0);
    await expect(remindersOf(task.id)).resolves.toEqual([]);
  });

  it("reckons all-day tasks in the saved time zone", async () => {
    // All day on Thu 3 Dec, as a device in New York saves it: local midnight there.
    const task = createTask(
      { title: "Bin day", due: { dueAt: "2026-12-03T05:00:00.000Z", allDay: true } },
      { id: crypto.randomUUID(), order: "a0", now: t0 },
    );
    await saveSettings(userId, { ...DEFAULT_SETTINGS, timeZone: "America/New_York" }, t0);
    await putTask(userId, { ...task, reminders: [offset(0, "minutes")] }, t0);
    // 09:00 in New York (EST, UTC-5).
    await expect(remindersOf(task.id)).resolves.toEqual([pendingAt(at("14:00", "2026-12-03"))]);
  });
});
