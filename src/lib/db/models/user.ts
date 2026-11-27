import { type Model, Schema, model, models } from "mongoose";

export interface UserDoc {
  _id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  /** Sign-in identities linked to this user (e.g. google + its account id). */
  accounts: Array<{ provider: string; providerAccountId: string }>;
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
  },
  { timestamps: true, versionKey: false },
);

userSchema.index({ "accounts.provider": 1, "accounts.providerAccountId": 1 }, { unique: true });

export const UserModel: Model<UserDoc> =
  (models.User as Model<UserDoc> | undefined) ?? model<UserDoc>("User", userSchema);
