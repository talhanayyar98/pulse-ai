import { subDays } from "date-fns";
import { connectDb } from "@/lib/db/connect";
import { NotificationModel } from "@/lib/db/models/notification";
import type { SentNotification } from "@/lib/domain/notifications";

/** How far back the notification centre goes, and how much of it. */
const HISTORY_DAYS = 30;
const HISTORY_LIMIT = 50;

/** Records a sent notification; recording the same one again changes nothing. */
export async function recordNotification(
  userId: string,
  notification: Omit<SentNotification, "createdAt">,
  now: Date,
): Promise<void> {
  await connectDb();
  const { id, ...fields } = notification;
  await NotificationModel.updateOne(
    { _id: id },
    { $setOnInsert: { ...fields, userId, createdAt: now } },
    { upsert: true },
  );
}

/** The user's recent notifications, newest first. */
export async function listNotifications(
  userId: string,
  now = new Date(),
): Promise<SentNotification[]> {
  await connectDb();
  const docs = await NotificationModel.find({
    userId,
    createdAt: { $gte: subDays(now, HISTORY_DAYS) },
  })
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT)
    .lean();
  return docs.map((doc) => ({
    id: doc._id,
    kind: doc.kind,
    taskId: doc.taskId,
    title: doc.title,
    body: doc.body,
    createdAt: doc.createdAt.toISOString(),
  }));
}
