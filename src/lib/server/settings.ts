import { connectDb } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models/user";
import type { ReminderPolicy } from "@/lib/domain/reminders";
import {
  readSettings,
  reminderPolicy,
  reminderSettingsChanged,
  type Settings,
} from "@/lib/domain/settings";
import { HttpError } from "./errors";
import { rescheduleUserReminders } from "./reminders";

/** Until a device reports the user's zone (the app does on its first load), reckon in UTC. */
const FALLBACK_TIME_ZONE = "UTC";

export async function getSettings(userId: string): Promise<Settings> {
  await connectDb();
  const user = await UserModel.findById(userId, { settings: 1 }).lean();
  if (!user) throw new HttpError(404, "User not found");
  return readSettings(user.settings);
}

/** Replaces the settings; a change to reminder settings reschedules the user's reminders. */
export async function saveSettings(
  userId: string,
  settings: Settings,
  now = new Date(),
): Promise<Settings> {
  await connectDb();
  const before = await UserModel.findByIdAndUpdate(
    userId,
    { $set: { settings } },
    { returnDocument: "before", projection: { settings: 1 }, lean: true },
  );
  if (!before) throw new HttpError(404, "User not found");
  if (reminderSettingsChanged(readSettings(before.settings), settings)) {
    await rescheduleUserReminders(userId, reminderPolicy(settings, FALLBACK_TIME_ZONE), now);
  }
  return settings;
}

/** The policy the user's reminders follow; the defaults for a user without a document. */
export async function reminderPolicyFor(userId: string): Promise<ReminderPolicy> {
  await connectDb();
  const user = await UserModel.findById(userId, { settings: 1 }).lean();
  return reminderPolicy(readSettings(user?.settings), FALLBACK_TIME_ZONE);
}
