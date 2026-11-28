import { type Model, Schema, model, models } from "mongoose";
import { type Settings, WEEK_START_DAYS } from "@/lib/domain/settings";

export interface UserDoc {
  _id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  /** Sign-in identities linked to this user (e.g. google + its account id). */
  accounts: Array<{ provider: string; providerAccountId: string }>;
  /** Absent until the user first saves a setting; read through `readSettings`. */
  settings?: Partial<Settings>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    _id: { type: String, required: true },
    email: { type: String, default: null },
    name: { type: String, default: null },
    image: { type: String, default: null },
    accounts: [
      {
        _id: false,
        provider: { type: String, required: true },
        providerAccountId: { type: String, required: true },
      },
    ],
    settings: {
      weekStartsOn: { type: Number, enum: WEEK_START_DAYS },
      timeZone: { type: String },
      // Mixed rather than an array path: Mongoose would default an array to [] on insert,
      // which reads as "no default reminders" instead of the built-in default.
      defaultReminders: { type: Schema.Types.Mixed },
      allDayReminderTime: { type: String },
    },
  },
  { timestamps: true, versionKey: false },
);

userSchema.index({ "accounts.provider": 1, "accounts.providerAccountId": 1 }, { unique: true });

export const UserModel: Model<UserDoc> =
  (models.User as Model<UserDoc> | undefined) ?? model<UserDoc>("User", userSchema);
