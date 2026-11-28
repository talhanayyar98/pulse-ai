import { connectDb } from "@/lib/db/connect";
import { ReminderModel } from "@/lib/db/models/reminder";
import { TaskModel } from "@/lib/db/models/task";
import {
  type ReminderPolicy,
  type ScheduledReminder,
  scheduledReminders,
} from "@/lib/domain/reminders";
import type { Task } from "@/lib/domain/task";
import { toTask } from "./task-mapper";

/**
 * A reminder this late isn't sent: by then the task's own state (due soon, overdue) says more.
 * Within it, an edit made offline before a reminder time but synced after it still reminds.
 */
export const MAX_LATENESS_MS = 12 * 60 * 60 * 1000;

export function reminderId(taskId: string, { ruleId, fireAt }: ScheduledReminder): string {
  return `${taskId}|${ruleId}|${fireAt.toISOString()}`;
}

/**
 * Brings the task's pending reminders in line with the task as stored.
 *
 * - Adds each reminder time after `changedAt`, when the change was made (setting a reminder
 *   for a moment that has already passed doesn't fire it), unless it's too late to send.
 * - Removes pending reminders still in the future that the task no longer wants. Ones whose
 *   time has come are left to the dispatcher, which checks them against the task before
 *   sending, so an unrelated edit in the seconds before a reminder fires can't cancel it.
 * - Never touches reminders that were sent, skipped or failed: they are the history.
 */
export async function scheduleTaskReminders(
  userId: string,
  task: Task,
  policy: ReminderPolicy,
  { changedAt, now }: { changedAt: Date; now: Date },
): Promise<void> {
  await connectDb();
  const version = new Date(task.updatedAt);
  const earliest = Math.max(changedAt.getTime(), now.getTime() - MAX_LATENESS_MS);
  const wanted = scheduledReminders(task, policy).filter(
    ({ fireAt }) => fireAt.getTime() > earliest,
  );
  const ids = wanted.map((reminder) => reminderId(task.id, reminder));

  if (wanted.length > 0) {
    await ReminderModel.bulkWrite(
      wanted.map((reminder, index) => ({
        updateOne: {
          filter: { _id: ids[index] },
          update: {
            $setOnInsert: {
              userId,
              taskId: task.id,
              ruleId: reminder.ruleId,
              fireAt: reminder.fireAt,
              state: "pending",
              claim: null,
              leaseUntil: null,
              attempts: 0,
              sentAt: null,
              lastError: null,
              createdAt: now,
            },
            $max: { taskVersion: version },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }

  await ReminderModel.deleteMany({
    taskId: task.id,
    state: "pending",
    fireAt: { $gt: now },
    taskVersion: { $lte: version },
    _id: { $nin: ids },
  });
}

/**
 * After a settings change: every open task of the user, against the new policy. Times that a
 * new default puts in the past are not sent late: the change, not the task, is from now.
 */
export async function rescheduleUserReminders(
  userId: string,
  policy: ReminderPolicy,
  now: Date,
): Promise<void> {
  await connectDb();
  const docs = await TaskModel.find({ userId, deletedAt: null, status: { $ne: "done" } }).lean();
  for (const doc of docs) {
    await scheduleTaskReminders(userId, toTask(doc), policy, { changedAt: now, now });
  }
}
