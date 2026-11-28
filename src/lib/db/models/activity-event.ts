import mongoose, { type Model, Schema, model } from "mongoose";
import type { ActivityEvent, ActivityType } from "@/lib/domain/activity";

export interface ActivityEventDoc {
  userId: string;
  taskId: string;
  type: ActivityType;
  payload: ActivityEvent["payload"];
  at: Date;
  /** Set on events that must be logged only once, e.g. `overdue:<task id>:<due date>`. */
  key?: string;
}

const activityEventSchema = new Schema<ActivityEventDoc>(
  {
    userId: { type: String, required: true },
    taskId: { type: String, required: true },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    at: { type: Date, required: true },
    key: { type: String },
  },
  { versionKey: false, collection: "activity_events" },
);

activityEventSchema.index({ userId: 1, at: -1 });
activityEventSchema.index({ taskId: 1, at: -1 });
activityEventSchema.index(
  { key: 1 },
  { unique: true, partialFilterExpression: { key: { $type: "string" } } },
);

export const ActivityEventModel: Model<ActivityEventDoc> =
  (mongoose.models.ActivityEvent as Model<ActivityEventDoc> | undefined) ??
  model<ActivityEventDoc>("ActivityEvent", activityEventSchema);
