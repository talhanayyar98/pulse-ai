import { subDays } from "date-fns";
import { connectDb } from "@/lib/db/connect";
import { ActivityEventModel } from "@/lib/db/models/activity-event";
import { TaskModel } from "@/lib/db/models/task";
import { deadline } from "@/lib/domain/filters";
import { reminderPolicyFor } from "./settings";

/** How far back a sweep looks; anything older was logged by earlier sweeps. */
const LOOKBACK_DAYS = 3;

/**
 * Logs an `overdue` activity event (the raw material of Phase 2 nudges) once for each due date
 * an open task misses. All-day tasks are overdue once their day has ended in the user's time
 * zone. Returns how many were newly logged.
 */
export async function sweepOverdue(now = new Date()): Promise<number> {
  await connectDb();
  const candidates = await TaskModel.find({
    dueAt: { $gte: subDays(now, LOOKBACK_DAYS), $lte: now },
    status: { $ne: "done" },
    deletedAt: null,
  }).lean();

  const zones = new Map<string, string>();
  let logged = 0;
  for (const doc of candidates) {
    if (!doc.dueAt) continue;
    const zone = zones.get(doc.userId) ?? (await reminderPolicyFor(doc.userId)).timeZone;
    zones.set(doc.userId, zone);
    const dueAt = doc.dueAt.toISOString();
    const missed = deadline({ dueAt, allDay: doc.allDay }, zone);
    if (!missed || missed >= now) continue;

    const result = await ActivityEventModel.updateOne(
      { key: `overdue:${doc._id}:${dueAt}` },
      {
        $setOnInsert: {
          userId: doc.userId,
          taskId: doc._id,
          type: "overdue",
          payload: { dueAt },
          at: missed,
        },
      },
      { upsert: true },
    );
    logged += result.upsertedCount;
  }
  return logged;
}
