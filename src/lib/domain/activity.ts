import type { Task } from "./task";
import type { TaskStatus } from "./task-status";

/**
 * Activity events are the raw material for Phase 2 nudges ("stuck in progress for 9 days",
 * "you usually miss Friday tasks"). Order-only changes (reordering in a column) are not logged.
 */
export type ActivityEvent =
  | { type: "created"; payload: { status: TaskStatus } }
  | { type: "moved"; payload: { from: TaskStatus; to: TaskStatus } }
  | { type: "completed"; payload: { from: TaskStatus } }
  | { type: "reopened"; payload: { to: TaskStatus } }
  | { type: "rescheduled"; payload: { from: string | null; to: string | null } }
  | { type: "updated"; payload: { fields: UpdatableField[] } }
  | { type: "deleted"; payload: Record<string, never> }
  /** Logged by the worker once per due date that passes with the task still open. */
  | { type: "overdue"; payload: { dueAt: string } };

export type ActivityType = ActivityEvent["type"];

const UPDATABLE_FIELDS = [
  "title",
  "description",
  "priority",
  "labels",
  "horizon",
  "recurrence",
  "reminders",
  "subtasks",
] as const satisfies readonly (keyof Task)[];
type UpdatableField = (typeof UPDATABLE_FIELDS)[number];

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Events describing what changed between the stored task (`previous`) and the incoming one. */
export function deriveActivity(previous: Task | null, next: Task): ActivityEvent[] {
  if (previous === null) {
    return next.deletedAt ? [] : [{ type: "created", payload: { status: next.status } }];
  }
  if (next.deletedAt) {
    return previous.deletedAt ? [] : [{ type: "deleted", payload: {} }];
  }

  const events: ActivityEvent[] = [];

  if (previous.status !== next.status) {
    if (next.status === "done") {
      events.push({ type: "completed", payload: { from: previous.status } });
    } else if (previous.status === "done") {
      events.push({ type: "reopened", payload: { to: next.status } });
    } else {
      events.push({ type: "moved", payload: { from: previous.status, to: next.status } });
    }
  }

  if (previous.dueAt !== next.dueAt || previous.allDay !== next.allDay) {
    events.push({ type: "rescheduled", payload: { from: previous.dueAt, to: next.dueAt } });
  }

  const fields = UPDATABLE_FIELDS.filter((field) => !sameValue(previous[field], next[field]));
  if (fields.length > 0) events.push({ type: "updated", payload: { fields } });

  return events;
}
