import { z } from "zod";
import { compareOrder, isValidOrderKey, keyBetweenNeighbours } from "./ordering";
import { recurrenceSchema } from "./recurrence";
import { taskIdSchema } from "./task-id";
import { TASK_STATUSES, type TaskStatus } from "./task-status";

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const HORIZONS = ["none", "week", "month"] as const;
export type Horizon = (typeof HORIZONS)[number];
export const HORIZON_LABEL: Record<Horizon, string> = {
  none: "None",
  week: "This week",
  month: "This month",
};

export const LIMITS = {
  title: 200,
  description: 20_000,
  label: 32,
  labels: 20,
  subtasks: 100,
} as const;

const timestamp = z.iso.datetime();

export const subtaskSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(LIMITS.title),
  done: z.boolean(),
});
export type Subtask = z.infer<typeof subtaskSchema>;

export const taskSchema = z
  .object({
    id: taskIdSchema,
    title: z.string().trim().min(1).max(LIMITS.title),
    description: z.string().max(LIMITS.description),
    status: z.enum(TASK_STATUSES),
    priority: z.enum(PRIORITIES),
    labels: z.array(z.string().trim().min(1).max(LIMITS.label)).max(LIMITS.labels),
    order: z.string().refine(isValidOrderKey, "Invalid order key"),
    dueAt: timestamp.nullable(),
    /** True when the task is due on a day rather than at a time; dueAt is local midnight. */
    allDay: z.boolean(),
    horizon: z.enum(HORIZONS),
    /** Defaults to null so snapshots from clients older than recurrence stay valid. */
    recurrence: recurrenceSchema.nullable().default(null),
    subtasks: z.array(subtaskSchema).max(LIMITS.subtasks),
    statusChangedAt: timestamp,
    completedAt: timestamp.nullable(),
    createdAt: timestamp,
    /** Last-write-wins clock: the newest updatedAt is kept when edits conflict. */
    updatedAt: timestamp,
    /** Soft delete, so other devices learn about deletions when they sync. */
    deletedAt: timestamp.nullable(),
  })
  .refine((task) => task.recurrence === null || task.dueAt !== null, {
    message: "A repeating task needs a due date",
    path: ["recurrence"],
  });
export type Task = z.infer<typeof taskSchema>;

export type TaskPatch = Partial<
  Pick<
    Task,
    | "title"
    | "description"
    | "status"
    | "priority"
    | "labels"
    | "order"
    | "dueAt"
    | "allDay"
    | "horizon"
    | "recurrence"
    | "subtasks"
  >
>;

export interface TaskDraft {
  title: string;
  status?: TaskStatus;
  priority?: Priority;
  labels?: readonly string[];
  due?: Pick<Task, "dueAt" | "allDay">;
}

/** Trims, collapses whitespace and removes case-insensitive duplicates, keeping first spelling. */
export function normalizeLabels(labels: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of labels) {
    const label = raw.trim().replace(/\s+/g, " ").slice(0, LIMITS.label);
    const key = label.toLowerCase();
    if (label && !seen.has(key)) {
      seen.add(key);
      result.push(label);
    }
  }
  return result;
}

/**
 * updatedAt must strictly increase for every local edit, even two in the same millisecond,
 * or the server would treat the second one as stale.
 */
function nextUpdatedAt(previous: string, now: Date): string {
  return new Date(Math.max(now.getTime(), Date.parse(previous) + 1)).toISOString();
}

export function createTask(
  draft: TaskDraft,
  context: { id: string; order: string; now: Date },
): Task {
  const createdAt = context.now.toISOString();
  const status = draft.status ?? "todo";
  return taskSchema.parse({
    id: context.id,
    title: draft.title,
    description: "",
    status,
    priority: draft.priority ?? "medium",
    labels: normalizeLabels(draft.labels ?? []),
    order: context.order,
    dueAt: draft.due?.dueAt ?? null,
    allDay: draft.due?.allDay ?? false,
    horizon: "none",
    recurrence: null,
    subtasks: [],
    statusChangedAt: createdAt,
    completedAt: status === "done" ? createdAt : null,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
  } satisfies Task);
}

export function applyTaskPatch(task: Task, patch: TaskPatch, now: Date): Task {
  const next: Task = {
    ...task,
    ...patch,
    labels: patch.labels ? normalizeLabels(patch.labels) : task.labels,
    updatedAt: nextUpdatedAt(task.updatedAt, now),
  };
  if (patch.status !== undefined && patch.status !== task.status) {
    next.statusChangedAt = now.toISOString();
    next.completedAt = patch.status === "done" ? now.toISOString() : null;
  }
  // A series is anchored on its due date: clearing the date ends the repeat.
  if (next.dueAt === null) next.recurrence = null;
  return taskSchema.parse(next);
}

export function markTaskDeleted(task: Task, now: Date): Task {
  const updatedAt = nextUpdatedAt(task.updatedAt, now);
  return { ...task, deletedAt: updatedAt, updatedAt };
}

export function tasksInColumn(tasks: readonly Task[], status: TaskStatus): Task[] {
  return tasks.filter((task) => task.status === status && !task.deletedAt).sort(compareOrder);
}

/**
 * Order key for dropping a task at `index` in a column, where `columnTasks` is the column in
 * display order *without* the task being moved.
 */
export function orderAtIndex(columnTasks: readonly Task[], index: number): string {
  const before = columnTasks[index - 1];
  const after = columnTasks[index];
  return keyBetweenNeighbours(before?.order ?? null, after?.order ?? null);
}

/** Order key that places a task above everything currently in the column. */
export function orderAtTopOf(tasks: readonly Task[], status: TaskStatus): string {
  return orderAtIndex(tasksInColumn(tasks, status), 0);
}
