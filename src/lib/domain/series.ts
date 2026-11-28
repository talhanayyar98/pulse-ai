import { addDays, differenceInCalendarDays, endOfDay } from "date-fns";
import { nextOccurrence } from "./recurrence";
import type { ReminderRule } from "./reminders";
import type { WeekStartsOn } from "./settings";
import { type Task, taskSchema } from "./task";
import { occurrenceId, seriesIdOf } from "./task-id";

/*
 * A recurring task is a series with one real task at a time: the current occurrence.
 * Completing it creates the next one; upcoming occurrences beyond that are projected for
 * the calendars and never stored.
 */

/**
 * The occurrences after `task`'s own, in order (an endless sequence: stop when done).
 * Any whose deadline has already passed are skipped, so completing a late task schedules
 * the next one from today rather than a run of overdue copies.
 */
export function* upcomingOccurrences(
  task: Task,
  now: Date,
  weekStartsOn: WeekStartsOn,
): Generator<Date, void> {
  if (!task.recurrence || !task.dueAt) return;
  let at = new Date(task.dueAt);
  for (;;) {
    at = nextOccurrence(task.recurrence, at, weekStartsOn);
    if ((task.allDay ? endOfDay(at) : at) >= now) yield at;
  }
}

/**
 * Reminders at a fixed moment move with the occurrence: "the evening before" stays the evening
 * before. Offsets from the deadline follow it by themselves.
 */
function shiftReminders(
  rules: readonly ReminderRule[] | null,
  from: Date,
  to: Date,
): ReminderRule[] | null {
  if (rules === null) return null;
  const days = differenceInCalendarDays(to, from);
  return rules.map((rule) =>
    rule.kind === "absolute"
      ? { ...rule, at: addDays(new Date(rule.at), days).toISOString() }
      : rule,
  );
}

/**
 * The task that follows `task` once it is completed: same details, unticked subtasks,
 * back in To Do, due on the series' next date. Null for a task that doesn't repeat.
 */
export function nextOccurrenceTask(
  task: Task,
  context: { now: Date; order: string; weekStartsOn: WeekStartsOn },
): Task | null {
  const next = upcomingOccurrences(task, context.now, context.weekStartsOn).next();
  if (next.done || !task.dueAt) return null;
  const createdAt = context.now.toISOString();
  return taskSchema.parse({
    ...task,
    id: occurrenceId(task.id, next.value),
    status: "todo",
    order: context.order,
    dueAt: next.value.toISOString(),
    reminders: shiftReminders(task.reminders, new Date(task.dueAt), next.value),
    subtasks: task.subtasks.map((subtask) => ({ ...subtask, done: false })),
    statusChangedAt: createdAt,
    completedAt: null,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
  } satisfies Task);
}

/**
 * The occurrence that completing `task` created, if nobody has touched it since.
 * Reopening `task` takes it back, so a mistaken tick doesn't leave two open copies.
 */
export function createdByCompletion(task: Task, tasks: readonly Task[]): Task | undefined {
  if (!task.completedAt) return undefined;
  const series = seriesIdOf(task.id);
  return tasks.find(
    (candidate) =>
      candidate.id !== task.id &&
      seriesIdOf(candidate.id) === series &&
      !candidate.deletedAt &&
      candidate.createdAt === task.completedAt &&
      candidate.updatedAt === candidate.createdAt,
  );
}

export interface ProjectedOccurrence {
  /** The current occurrence of the series; opening a projection opens this task. */
  task: Task;
  at: Date;
}

/**
 * Upcoming occurrences of every open recurring task that fall within [start, end].
 * Days where the series already has a real task (say, one created ahead of time) are left
 * out, so a projection never sits next to the task it stands for.
 */
export function projectOccurrences(
  tasks: readonly Task[],
  range: { start: Date; end: Date },
  now: Date,
  weekStartsOn: WeekStartsOn,
): ProjectedOccurrence[] {
  const taken = new Set(
    tasks.flatMap((task) =>
      task.dueAt && !task.deletedAt ? [occurrenceId(task.id, new Date(task.dueAt))] : [],
    ),
  );
  const projected: ProjectedOccurrence[] = [];
  for (const task of currentOccurrences(tasks)) {
    for (const at of upcomingOccurrences(task, now, weekStartsOn)) {
      if (at > range.end) break;
      if (at >= range.start && !taken.has(occurrenceId(task.id, at))) projected.push({ task, at });
    }
  }
  return projected;
}

/** Each series' open occurrence: normally there is one; with several, the latest leads. */
function currentOccurrences(tasks: readonly Task[]): Task[] {
  const bySeries = new Map<string, Task>();
  for (const task of tasks) {
    if (!task.recurrence || !task.dueAt || task.status === "done" || task.deletedAt) continue;
    const series = seriesIdOf(task.id);
    const leader = bySeries.get(series);
    if (!leader || Date.parse(task.dueAt) > Date.parse(leader.dueAt ?? "")) {
      bySeries.set(series, task);
    }
  }
  return [...bySeries.values()];
}
