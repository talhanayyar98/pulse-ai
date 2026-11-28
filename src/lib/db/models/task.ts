import { type Model, Schema, model, models } from "mongoose";
import type { Recurrence } from "@/lib/domain/recurrence";
import { HORIZONS, PRIORITIES, type Horizon, type Priority } from "@/lib/domain/task";
import { TASK_STATUSES, type TaskStatus } from "@/lib/domain/task-status";

export interface TaskDoc {
  _id: string;
  userId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  labels: string[];
  order: string;
  dueAt: Date | null;
  allDay: boolean;
  horizon: Horizon;
  /** Absent on tasks stored before recurrence existed. */
  recurrence?: Recurrence | null;
  subtasks: Array<{ id: string; title: string; done: boolean }>;
  statusChangedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const taskSchema = new Schema<TaskDoc>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    status: { type: String, enum: TASK_STATUSES, required: true },
    priority: { type: String, enum: PRIORITIES, required: true },
    labels: { type: [String], default: [] },
    order: { type: String, required: true },
    dueAt: { type: Date, default: null },
    allDay: { type: Boolean, default: false },
    horizon: { type: String, enum: HORIZONS, required: true },
    // Validated by recurrenceSchema at the API boundary; stored as sent.
    recurrence: { type: Schema.Types.Mixed, default: null },
    subtasks: [
      {
        _id: false,
        id: { type: String, required: true },
        title: { type: String, required: true },
        done: { type: Boolean, required: true },
      },
    ],
    statusChangedAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    // Timestamps are owned by the client (last-write-wins), so Mongoose must not touch them.
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    deletedAt: { type: Date, default: null },
  },
  { versionKey: false, timestamps: false },
);

taskSchema.index({ userId: 1, status: 1, order: 1 });
taskSchema.index({ userId: 1, dueAt: 1 });

export const TaskModel: Model<TaskDoc> =
  (models.Task as Model<TaskDoc> | undefined) ?? model<TaskDoc>("Task", taskSchema);
