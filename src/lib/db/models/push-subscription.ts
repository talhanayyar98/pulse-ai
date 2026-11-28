import { type Model, Schema, model, models } from "mongoose";

/** One browser (or installed app) that receives the user's pushes. */
export interface PushSubscriptionDoc {
  /** The push service endpoint: unique per browser subscription. */
  _id: string;
  userId: string;
  keys: { p256dh: string; auth: string };
  createdAt: Date;
  updatedAt: Date;
}

const pushSubscriptionSchema = new Schema<PushSubscriptionDoc>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { versionKey: false, timestamps: false, collection: "push_subscriptions" },
);

pushSubscriptionSchema.index({ userId: 1 });

export const PushSubscriptionModel: Model<PushSubscriptionDoc> =
  (models.PushSubscription as Model<PushSubscriptionDoc> | undefined) ??
  model<PushSubscriptionDoc>("PushSubscription", pushSubscriptionSchema);
