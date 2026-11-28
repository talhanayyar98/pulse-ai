import { connectDb } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models/user";
import { readSettings, type Settings } from "@/lib/domain/settings";
import { HttpError } from "./errors";

export async function getSettings(userId: string): Promise<Settings> {
  await connectDb();
  const user = await UserModel.findById(userId, { settings: 1 }).lean();
  if (!user) throw new HttpError(404, "User not found");
  return readSettings(user.settings);
}

export async function saveSettings(userId: string, settings: Settings): Promise<Settings> {
  await connectDb();
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: { settings } },
    { returnDocument: "after", projection: { settings: 1 }, lean: true },
  );
  if (!user) throw new HttpError(404, "User not found");
  return readSettings(user.settings);
}
