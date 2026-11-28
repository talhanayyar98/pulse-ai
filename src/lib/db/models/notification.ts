import { type Model, Schema, model, models } from "mongoose";

/** A notification the server sent, kept for the notification centre. */
export interface NotificationDoc {
  /** What it's about, e.g. `reminder:<reminder id>`: one notification per source, ever. */
  _id: string;
  userId: string;
  kind: "reminder";
  taskId: string;
  title: string;
  body: string;
  createdAt: Date;
}

const notificationSchema = new Schema<NotificationDoc>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    kind: { type: String, enum: ["reminder"], required: true },
    taskId: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    createdAt: { type: Date, required: true },
  },
  { versionKey: false, timestamps: false },
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export const NotificationModel: Model<NotificationDoc> =
  (models.Notification as Model<NotificationDoc> | undefined) ??
  model<NotificationDoc>("Notification", notificationSchema);
