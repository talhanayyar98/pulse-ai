import { type Model, Schema, model, models } from "mongoose";

/**
 * pending → sending (claimed by a dispatcher, under a lease) → sent | skipped | failed.
 * A lease that runs out (a dispatcher crashed) puts the reminder up for claiming again.
 */
export const REMINDER_STATES = ["pending", "sending", "sent", "skipped", "failed"] as const;
export type ReminderState = (typeof REMINDER_STATES)[number];

export interface ReminderDoc {
  /** `<task id>|<rule id>|<fire time>`: one document per moment a rule fires for a task. */
  _id: string;
  userId: string;
  taskId: string;
  ruleId: string;
  fireAt: Date;
  state: ReminderState;
  /**
   * The newest task version (its updatedAt) that wanted this reminder. A recalculation only
   * removes reminders no newer than the version it works from, so one that runs late can't
   * undo a newer one's work.
   */
  taskVersion: Date;
  /** Who holds the claim while "sending", and until when. */
  claim: string | null;
  leaseUntil: Date | null;
  attempts: number;
  sentAt: Date | null;
  /** Why it was skipped or failed, or the last delivery error. */
  lastError: string | null;
  createdAt: Date;
}

const reminderSchema = new Schema<ReminderDoc>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    taskId: { type: String, required: true },
    ruleId: { type: String, required: true },
    fireAt: { type: Date, required: true },
    state: { type: String, enum: REMINDER_STATES, required: true },
    taskVersion: { type: Date, required: true },
    claim: { type: String, default: null },
    leaseUntil: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
    sentAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    createdAt: { type: Date, required: true },
  },
  { versionKey: false, timestamps: false },
);

// What's due, and what a crashed dispatcher left behind.
reminderSchema.index({ state: 1, fireAt: 1 });
reminderSchema.index({ state: 1, leaseUntil: 1 });
reminderSchema.index({ taskId: 1, state: 1 });

export const ReminderModel: Model<ReminderDoc> =
  (models.Reminder as Model<ReminderDoc> | undefined) ??
  model<ReminderDoc>("Reminder", reminderSchema);
