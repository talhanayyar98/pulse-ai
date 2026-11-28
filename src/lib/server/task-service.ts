import { connectDb } from "@/lib/db/connect";
import { ActivityEventModel } from "@/lib/db/models/activity-event";
import { TaskModel } from "@/lib/db/models/task";
import { deriveActivity } from "@/lib/domain/activity";
import { affectsReminders } from "@/lib/domain/reminders";
import type { Task } from "@/lib/domain/task";
import { HttpError, isDuplicateKeyError } from "./errors";
import { scheduleTaskReminders } from "./reminders";
import { reminderPolicyFor } from "./settings";
import { toTask, toTaskDoc } from "./task-mapper";

export async function listTasks(userId: string): Promise<Task[]> {
  await connectDb();
  const docs = await TaskModel.find({ userId, deletedAt: null }).sort({ order: 1, _id: 1 }).lean();
  return docs.map(toTask);
}

export interface PutTaskResult {
  status: "applied" | "stale";
  /** The task as the server now stores it. */
  task: Task;
}

const MAX_ATTEMPTS = 5;

/**
 * Stores a full task snapshot if it is newer than what the server has (last-write-wins on
 * updatedAt). Every task write goes through here, so activity logging and reminder
 * scheduling cannot be skipped.
 */
export async function putTask(
  userId: string,
  incoming: Task,
  now = new Date(),
): Promise<PutTaskResult> {
  await connectDb();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const existingDoc = await TaskModel.findById(incoming.id).lean();
    // Answer "not found" rather than "forbidden" so task ids of other users don't leak.
    if (existingDoc && existingDoc.userId !== userId) throw new HttpError(404, "Task not found");
    const existing = existingDoc ? toTask(existingDoc) : null;

    if (existing && Date.parse(incoming.updatedAt) <= Date.parse(existing.updatedAt)) {
      return { status: "stale", task: existing };
    }

    const next = normalizeTimestamps(incoming, existing, now);
    const doc = toTaskDoc(next, userId);

    if (existing) {
      // Conditional replace: if another write landed since we read, loop and re-compare.
      const result = await TaskModel.replaceOne(
        { _id: next.id, userId, updatedAt: new Date(existing.updatedAt) },
        doc,
      );
      if (result.matchedCount === 0) continue;
    } else {
      try {
        await TaskModel.create(doc);
      } catch (error) {
        if (isDuplicateKeyError(error)) continue;
        throw error;
      }
    }

    const events = deriveActivity(existing, next);
    if (events.length > 0) {
      await ActivityEventModel.insertMany(
        events.map((event) => ({ ...event, userId, taskId: next.id, at: now })),
      );
    }
    if (affectsReminders(existing, next)) {
      await scheduleTaskReminders(userId, next, await reminderPolicyFor(userId), {
        changedAt: new Date(next.updatedAt),
        now,
      });
    }
    return { status: "applied", task: next };
  }

  throw new HttpError(409, "Task was edited concurrently; please retry");
}

/**
 * Client clocks can be wrong. Clamp future timestamps to server time so one fast clock
 * can't win every future conflict, and keep createdAt immutable once stored.
 */
function normalizeTimestamps(incoming: Task, existing: Task | null, now: Date): Task {
  const clamp = (iso: string) => (Date.parse(iso) > now.getTime() ? now.toISOString() : iso);
  return {
    ...incoming,
    createdAt: existing?.createdAt ?? clamp(incoming.createdAt),
    updatedAt: clamp(incoming.updatedAt),
  };
}
