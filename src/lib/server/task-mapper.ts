import type { TaskDoc } from "@/lib/db/models/task";
import type { Task } from "@/lib/domain/task";

const iso = (date: Date) => date.toISOString();
const isoOrNull = (date: Date | null) => (date ? date.toISOString() : null);
const dateOrNull = (value: string | null) => (value ? new Date(value) : null);

export function toTask(doc: TaskDoc): Task {
  return {
    id: doc._id,
    title: doc.title,
    description: doc.description,
    status: doc.status,
    priority: doc.priority,
    labels: doc.labels,
    order: doc.order,
    dueAt: isoOrNull(doc.dueAt),
    allDay: doc.allDay,
    horizon: doc.horizon,
    recurrence: doc.recurrence ?? null,
    subtasks: doc.subtasks.map(({ id, title, done }) => ({ id, title, done })),
    statusChangedAt: iso(doc.statusChangedAt),
    completedAt: isoOrNull(doc.completedAt),
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
    deletedAt: isoOrNull(doc.deletedAt),
  };
}

export function toTaskDoc(task: Task, userId: string): TaskDoc {
  return {
    _id: task.id,
    userId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    labels: task.labels,
    order: task.order,
    dueAt: dateOrNull(task.dueAt),
    allDay: task.allDay,
    horizon: task.horizon,
    recurrence: task.recurrence,
    subtasks: task.subtasks,
    statusChangedAt: new Date(task.statusChangedAt),
    completedAt: dateOrNull(task.completedAt),
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
    deletedAt: dateOrNull(task.deletedAt),
  };
}
