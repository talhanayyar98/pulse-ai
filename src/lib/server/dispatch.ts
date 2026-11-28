import { randomUUID } from "node:crypto";
import { connectDb } from "@/lib/db/connect";
import { type ReminderDoc, ReminderModel, type ReminderState } from "@/lib/db/models/reminder";
import { TaskModel } from "@/lib/db/models/task";
import { deadline } from "@/lib/domain/filters";
import type { PushMessage } from "@/lib/domain/push";
import { isStillScheduled } from "@/lib/domain/reminders";
import type { Task } from "@/lib/domain/task";
import { formatDue } from "@/lib/due-date";
import { recordNotification } from "./notifications";
import { configuredPushSender, type PushSender, pushToUser } from "./push";
import { MAX_LATENESS_MS } from "./reminders";
import { reminderPolicyFor } from "./settings";
import { toTask } from "./task-mapper";

/** How long a claim lasts; a dispatcher that dies mid-send frees its reminder after this. */
const LEASE_MS = 2 * 60_000;
/** Claims per reminder before giving up (each run tries a reminder at most once). */
const MAX_ATTEMPTS = 5;
/** A run stops claiming after this long; the next one (seconds later) carries on. */
const MAX_RUN_MS = 45_000;

export interface DispatchSummary {
  sent: number;
  skipped: number;
  failed: number;
  /** Not delivered yet after a temporary failure; tried again on the next run. */
  retrying: number;
}

type Outcome = { state: Exclude<ReminderState, "sending">; error: string | null };

/** The notification for a reminder of `task`, worded in the user's time zone. */
export function reminderMessage(
  task: Task,
  reminderId: string,
  timeZone: string,
  now: Date,
): PushMessage {
  const due = formatDue(task, now, timeZone);
  const passed = (deadline(task, timeZone)?.getTime() ?? Infinity) < now.getTime();
  return {
    kind: "reminder",
    notificationId: `reminder:${reminderId}`,
    taskId: task.id,
    title: task.title,
    body: due ? `${passed ? "Was due" : "Due"} ${due}` : "Reminder",
    url: `/board?task=${encodeURIComponent(task.id)}`,
  };
}

async function deliver(
  reminder: ReminderDoc,
  now: Date,
  push: PushSender | null,
): Promise<Outcome> {
  if (reminder.attempts > MAX_ATTEMPTS) {
    return { state: "failed", error: reminder.lastError ?? "Gave up after repeated attempts" };
  }
  if (now.getTime() - reminder.fireAt.getTime() > MAX_LATENESS_MS) {
    return { state: "skipped", error: "Too late to be useful" };
  }

  // The task may have changed since the reminder was scheduled: check it still wants it.
  const doc = await TaskModel.findById(reminder.taskId).lean();
  const task = doc && doc.userId === reminder.userId ? toTask(doc) : null;
  const policy = await reminderPolicyFor(reminder.userId);
  if (!task || !isStillScheduled(task, policy, reminder)) {
    return { state: "skipped", error: "No longer scheduled" };
  }

  const message = reminderMessage(task, reminder._id, policy.timeZone, now);
  // First, so a retried push never adds a second entry to the notification centre.
  await recordNotification(
    reminder.userId,
    {
      id: message.notificationId,
      kind: "reminder",
      taskId: task.id,
      title: message.title,
      body: message.body,
    },
    now,
  );
  if (!push) return { state: "sent", error: null };

  const { outcome, error } = await pushToUser(
    reminder.userId,
    message,
    push,
    MAX_LATENESS_MS / 1000,
  );
  return outcome === "retry" ? { state: "pending", error } : { state: "sent", error };
}

/**
 * Sends every reminder that is due at `now`, each exactly once even with several dispatchers
 * running at the same time: a reminder is claimed atomically (pending → sending, under a lease)
 * before anything is sent, and only the claim's holder may record the result.
 *
 * The one gap is a crash after sending but before recording "sent": the lease runs out and the
 * reminder is sent again. Its push topic and notification tag are the same both times, so the
 * device replaces the first notification rather than showing two.
 */
export async function dispatchDueReminders({
  now = new Date(),
  push = configuredPushSender(),
}: { now?: Date; push?: PushSender | null } = {}): Promise<DispatchSummary> {
  await connectDb();
  const summary: DispatchSummary = { sent: 0, skipped: 0, failed: 0, retrying: 0 };
  const tried: string[] = [];
  const started = performance.now();

  while (performance.now() - started < MAX_RUN_MS) {
    const claim = randomUUID();
    const reminder = await ReminderModel.findOneAndUpdate(
      {
        _id: { $nin: tried },
        fireAt: { $lte: now },
        $or: [{ state: "pending" }, { state: "sending", leaseUntil: { $lte: now } }],
      },
      {
        $set: { state: "sending", claim, leaseUntil: new Date(now.getTime() + LEASE_MS) },
        $inc: { attempts: 1 },
      },
      { sort: { fireAt: 1 }, returnDocument: "after" },
    ).lean();
    if (!reminder) break;
    tried.push(reminder._id);

    const outcome = await deliver(reminder, now, push).catch((error: unknown): Outcome => ({
      state: "pending",
      error: String(error),
    }));
    await ReminderModel.updateOne(
      { _id: reminder._id, claim },
      {
        $set: {
          state: outcome.state,
          claim: null,
          leaseUntil: null,
          lastError: outcome.error,
          sentAt: outcome.state === "sent" ? now : null,
        },
      },
    );
    if (outcome.state === "pending") summary.retrying++;
    else summary[outcome.state]++;
  }

  return summary;
}
