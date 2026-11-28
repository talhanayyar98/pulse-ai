import { addDays } from "date-fns";
import { deadline, DUE_SOON_MS, isDueSoon, isOverdue } from "./filters";
import type { Task } from "./task";

/**
 * Notifications are derived from the tasks themselves (no server feed yet): each one exists
 * while its condition holds and disappears when the task changes (rescheduled, moved, done).
 */
export type NotificationKind = "overdue" | "due_soon" | "stuck" | "completed";

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

/** Newest first. */
export function deriveNotifications(tasks: readonly Task[], now: Date): TaskNotification[] {
  const notifications: TaskNotification[] = [];

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
