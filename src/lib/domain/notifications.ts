import { addDays } from "date-fns";
import { z } from "zod";
import { deadline, DUE_SOON_MS, isDueSoon, isOverdue } from "./filters";
import type { Task } from "./task";
import { taskIdSchema } from "./task-id";

/**
 * Most notifications are derived from the tasks themselves: each one exists while its
 * condition holds and disappears when the task changes (rescheduled, moved, done). Reminders
 * are the exception: the server sends them and keeps each one as history.
 */
export type NotificationKind = "overdue" | "due_soon" | "stuck" | "completed" | "reminder";

/** A notification the server sent, kept as history (GET /api/notifications). */
export const sentNotificationSchema = z.object({
  id: z.string(),
  kind: z.literal("reminder"),
  taskId: taskIdSchema,
  title: z.string(),
  body: z.string(),
  createdAt: z.iso.datetime(),
});
export type SentNotification = z.infer<typeof sentNotificationSchema>;

export const notificationsResponseSchema = z.object({
  notifications: z.array(sentNotificationSchema),
});
export type NotificationsResponse = z.infer<typeof notificationsResponseSchema>;

export interface TaskNotification {
  /** Stable while the condition holds; a reschedule or new status change yields a new id. */
  id: string;
  kind: NotificationKind;
  task: Task;
  /** When the notification "happened", e.g. the moment the task became overdue. */
  at: Date;
  /** The moment it is about: the deadline, the move into In Progress, or the completion. */
  ref: Date;
}

/** An In Progress task untouched (status-wise) for this long is flagged as stuck. */
export const STUCK_AFTER_DAYS = 7;
/** Finished tasks are celebrated for this long. */
export const RECENTLY_COMPLETED_MS = 24 * 60 * 60 * 1000;

function notification(kind: NotificationKind, task: Task, at: Date, ref: Date): TaskNotification {
  return { id: `${kind}:${task.id}:${ref.toISOString()}`, kind, task, at, ref };
}

/**
 * Newest first. Sent reminders are listed while their task exists, showing it as it is now;
 * `ref` is its deadline, or the moment it was sent for an undated task.
 */
export function deriveNotifications(
  tasks: readonly Task[],
  now: Date,
  sent: readonly SentNotification[] = [],
): TaskNotification[] {
  const notifications: TaskNotification[] = [];
  const live = new Map(tasks.filter((task) => !task.deletedAt).map((task) => [task.id, task]));
  for (const reminder of sent) {
    const task = live.get(reminder.taskId);
    const at = new Date(reminder.createdAt);
    if (task)
      notifications.push({
        id: reminder.id,
        kind: "reminder",
        task,
        at,
        ref: deadline(task) ?? at,
      });
  }

  for (const task of tasks) {
    if (task.deletedAt) continue;
    const due = deadline(task);

    if (due && isOverdue(task, now)) {
      notifications.push(notification("overdue", task, due, due));
    } else if (due && isDueSoon(task, now)) {
      notifications.push(
        notification("due_soon", task, new Date(due.getTime() - DUE_SOON_MS), due),
      );
    }

    if (task.status === "in_progress") {
      const since = new Date(task.statusChangedAt);
      const stuckAt = addDays(since, STUCK_AFTER_DAYS);
      if (stuckAt <= now) notifications.push(notification("stuck", task, stuckAt, since));
    }

    if (task.status === "done" && task.completedAt) {
      const completed = new Date(task.completedAt);
      if (now.getTime() - completed.getTime() <= RECENTLY_COMPLETED_MS) {
        notifications.push(notification("completed", task, completed, completed));
      }
    }
  }

  return notifications.sort((a, b) => b.at.getTime() - a.at.getTime());
}
