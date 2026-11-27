import { type Model, Schema, model, models } from "mongoose";
import type { ActivityEvent, ActivityType } from "@/lib/domain/activity";

export interface ActivityEventDoc {
  userId: string;
  taskId: string;
  type: ActivityType;
  payload: ActivityEvent["payload"];
  at: Date;
}

const activityEventSchema = new Schema<ActivityEventDoc>(
  {
    userId: { type: String, required: true },
    taskId: { type: String, required: true },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    at: { type: Date, required: true },
  },
  { versionKey: false, collection: "activity_events" },
);

activityEventSchema.index({ userId: 1, at: -1 });
activityEventSchema.index({ taskId: 1, at: -1 });

export const ActivityEventModel: Model<ActivityEventDoc> =
  (models.ActivityEvent as Model<ActivityEventDoc> | undefined) ??
  model<ActivityEventDoc>("ActivityEvent", activityEventSchema);
