import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDb } from "@/lib/db/connect";
import { ActivityEventModel } from "@/lib/db/models/activity-event";
import { NotificationModel } from "@/lib/db/models/notification";
import { PushSubscriptionModel } from "@/lib/db/models/push-subscription";
import { ReminderModel } from "@/lib/db/models/reminder";
import { TaskModel } from "@/lib/db/models/task";
import type { PushMessage } from "@/lib/domain/push";
import { applyTaskPatch, createTask, type Task } from "@/lib/domain/task";
import { dispatchDueReminders } from "@/lib/server/dispatch";
import { listNotifications } from "@/lib/server/notifications";
import {
  deletePushSubscription,
  type PushResult,
  type PushSender,
  savePushSubscription,
} from "@/lib/server/push";
import { putTask } from "@/lib/server/task-service";

const alice = "user-alice";
const bob = "user-bob";
const at = (time: string, day = "2026-12-01") => new Date(`${day}T${time}.000Z`);
const t0 = at("10:00:00");

/** Due at `dueAt` with the default reminder (one hour before), written at t0. */
function dueTask(dueAt: Date, title = "Pick up the keys"): Task {
  return createTask(
    { title, due: { dueAt: dueAt.toISOString(), allDay: false } },
    { id: crypto.randomUUID(), order: "a0", now: t0 },
  );
}

function device(name: string) {
  return {
    endpoint: `https://push.example.com/${name}`,
    keys: { p256dh: `p-${name}`, auth: name },
  };
}

/** Records every push; answers with `answer` after a moment, so concurrent runs interleave. */
function fakeSender(answer: (endpoint: string) => PushResult = () => ({ status: "delivered" })) {
  const sent: Array<{ endpoint: string; message: PushMessage; topic: string }> = [];
  const sender: PushSender = {
    async send(subscription, payload, { topic }) {
      sent.push({ endpoint: subscription.endpoint, message: JSON.parse(payload), topic });
      await new Promise((resolve) => setTimeout(resolve, 2));
      return answer(subscription.endpoint);
    },
  };
  return { sender, sent };
}

const states = async () =>
  (await ReminderModel.find().sort({ fireAt: 1 }).lean()).map((doc) => doc.state);

beforeAll(async () => {
  await connectDb();
  await Promise.all([
    ReminderModel.init(),
    TaskModel.init(),
    NotificationModel.init(),
    PushSubscriptionModel.init(),
  ]);
});

beforeEach(async () => {
  await Promise.all([
    ReminderModel.deleteMany({}),
    TaskModel.deleteMany({}),
    ActivityEventModel.deleteMany({}),
    NotificationModel.deleteMany({}),
    PushSubscriptionModel.deleteMany({}),
  ]);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("dispatchDueReminders", () => {
  it("pushes a due reminder to each of the user's devices and keeps it in the history", async () => {
    const task = dueTask(at("12:00:00"));
    await putTask(alice, task, t0);
    await savePushSubscription(alice, device("laptop"));
    await savePushSubscription(alice, device("phone"));
    await savePushSubscription(bob, device("bobs-phone"));
    const { sender, sent } = fakeSender();

    const summary = await dispatchDueReminders({ now: at("11:00:10"), push: sender });

    expect(summary).toEqual({ sent: 1, skipped: 0, failed: 0, retrying: 0 });
    expect(sent.map(({ endpoint }) => endpoint).sort()).toEqual([
      device("laptop").endpoint,
      device("phone").endpoint,
    ]);
    const message = sent[0]?.message;
    expect(message).toMatchObject({
      kind: "reminder",
      taskId: task.id,
      title: "Pick up the keys",
      body: "Due Today 12:00",
      url: `/board?task=${task.id}`,
    });
    expect(sent[0]?.topic).toMatch(/^[\w-]{32}$/);
    await expect(states()).resolves.toEqual(["sent"]);
    await expect(listNotifications(alice, at("11:01:00"))).resolves.toEqual([
      {
        id: message?.notificationId,
        kind: "reminder",
        taskId: task.id,
        title: "Pick up the keys",
        body: "Due Today 12:00",
        createdAt: at("11:00:10").toISOString(),
      },
    ]);
  });

  it("leaves reminders that aren't due yet", async () => {
    await putTask(alice, dueTask(at("12:00:00")), t0);
    const { sender, sent } = fakeSender();
    await dispatchDueReminders({ now: at("10:59:59"), push: sender });
    expect(sent).toEqual([]);
    await expect(states()).resolves.toEqual(["pending"]);
  });

  it("sends each reminder exactly once when two dispatchers run at the same time", async () => {
    for (let index = 0; index < 20; index++) {
      await putTask(alice, dueTask(at("12:00:00"), `Task ${index}`), t0);
    }
    await savePushSubscription(alice, device("laptop"));
    const { sender, sent } = fakeSender();

    const runs = await Promise.all([
      dispatchDueReminders({ now: at("11:00:10"), push: sender }),
      dispatchDueReminders({ now: at("11:00:10"), push: sender }),
    ]);

    expect(sent).toHaveLength(20);
    expect(new Set(sent.map(({ message }) => message.notificationId)).size).toBe(20);
    expect(runs.reduce((total, run) => total + run.sent, 0)).toBe(20);
    await expect(NotificationModel.countDocuments()).resolves.toBe(20);
    await expect(ReminderModel.countDocuments({ state: "sent" })).resolves.toBe(20);
  });

  it("checks the task first, skipping a reminder it no longer wants", async () => {
    const task = dueTask(at("12:00:00"));
    await putTask(alice, task, t0);
    // Rescheduled a few seconds after the reminder was due, before a dispatcher got to it.
    const moved = applyTaskPatch(task, { dueAt: at("18:00:00").toISOString() }, at("11:00:05"));
    await putTask(alice, moved, at("11:00:05"));
    const { sender, sent } = fakeSender();
    await savePushSubscription(alice, device("laptop"));

    const summary = await dispatchDueReminders({ now: at("11:00:10"), push: sender });
    expect(summary).toMatchObject({ sent: 0, skipped: 1 });
    expect(sent).toEqual([]);
    await expect(states()).resolves.toEqual(["skipped", "pending"]);
  });

  it("words a late reminder for a task already past its deadline", async () => {
    await putTask(alice, dueTask(at("12:00:00")), t0);
    const { sender, sent } = fakeSender();
    await savePushSubscription(alice, device("laptop"));
    await dispatchDueReminders({ now: at("12:30:00"), push: sender });
    expect(sent[0]?.message.body).toBe("Was due Today 12:00");
  });

  it("skips a reminder that is more than 12 hours late", async () => {
    await putTask(alice, dueTask(at("12:00:00")), t0);
    const summary = await dispatchDueReminders({ now: at("23:00:01"), push: fakeSender().sender });
    expect(summary).toMatchObject({ sent: 0, skipped: 1 });
  });

  it("forgets devices whose subscription is gone", async () => {
    await putTask(alice, dueTask(at("12:00:00")), t0);
    await savePushSubscription(alice, device("laptop"));
    await savePushSubscription(alice, device("old-browser"));
    const { sender } = fakeSender((endpoint) =>
      endpoint.endsWith("old-browser") ? { status: "gone" } : { status: "delivered" },
    );

    await dispatchDueReminders({ now: at("11:00:10"), push: sender });
    const left = await PushSubscriptionModel.find().lean();
    expect(left.map((doc) => doc._id)).toEqual([device("laptop").endpoint]);
    await expect(states()).resolves.toEqual(["sent"]);
  });

  it("retries after a temporary failure on the next run, then gives up", async () => {
    await putTask(alice, dueTask(at("12:00:00")), t0);
    await savePushSubscription(alice, device("laptop"));
    const { sender, sent } = fakeSender(() => ({ status: "failed", error: "503 Unavailable" }));
    const run = (second: number) =>
      dispatchDueReminders({ now: at(`11:00:${String(second).padStart(2, "0")}`), push: sender });

    // Each run tries a reminder once; it stays pending between runs.
    await expect(run(10)).resolves.toMatchObject({ retrying: 1 });
    await expect(states()).resolves.toEqual(["pending"]);
    for (const second of [20, 30, 40, 50]) await run(second);
    expect(sent).toHaveLength(5);

    await expect(run(59)).resolves.toMatchObject({ failed: 1 });
    expect(sent).toHaveLength(5);
    const [reminder] = await ReminderModel.find().lean();
    expect(reminder).toMatchObject({ state: "failed", lastError: "503 Unavailable" });
    // The notification centre got it once, on the first attempt.
    await expect(NotificationModel.countDocuments()).resolves.toBe(1);
  });

  it("takes over a reminder whose dispatcher stopped mid-send once its lease runs out", async () => {
    await putTask(alice, dueTask(at("12:00:00")), t0);
    await ReminderModel.updateMany(
      {},
      { state: "sending", claim: "crashed", leaseUntil: at("11:02:00"), attempts: 1 },
    );
    const { sender } = fakeSender();
    await savePushSubscription(alice, device("laptop"));

    await expect(
      dispatchDueReminders({ now: at("11:01:00"), push: sender }),
    ).resolves.toMatchObject({ sent: 0 });
    await expect(
      dispatchDueReminders({ now: at("11:02:00"), push: sender }),
    ).resolves.toMatchObject({ sent: 1 });
  });

  it("still fills the notification centre when the server can't push", async () => {
    await putTask(alice, dueTask(at("12:00:00")), t0);
    await expect(dispatchDueReminders({ now: at("11:00:10"), push: null })).resolves.toMatchObject({
      sent: 1,
    });
    await expect(listNotifications(alice, at("11:01:00"))).resolves.toHaveLength(1);
  });
});

describe("push subscriptions", () => {
  it("moves a browser to the account that registered it last", async () => {
    await savePushSubscription(alice, device("shared-laptop"));
    await savePushSubscription(bob, device("shared-laptop"));
    await deletePushSubscription(alice, device("shared-laptop").endpoint);
    const [doc] = await PushSubscriptionModel.find().lean();
    expect(doc?.userId).toBe(bob);

    await deletePushSubscription(bob, device("shared-laptop").endpoint);
    await expect(PushSubscriptionModel.countDocuments()).resolves.toBe(0);
  });
});
