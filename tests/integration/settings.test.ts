import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDb } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models/user";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/domain/settings";
import { HttpError } from "@/lib/server/errors";
import { getSettings, saveSettings } from "@/lib/server/settings";
import { upsertUserForAccount } from "@/lib/server/users";

let userId = "";

beforeAll(async () => {
  await connectDb();
  await UserModel.init();
});

beforeEach(async () => {
  await UserModel.deleteMany({});
  userId = await upsertUserForAccount({
    provider: "google",
    providerAccountId: "42",
    email: null,
    name: "Grace",
    image: null,
  });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("settings", () => {
  it("gives a user who never saved settings the defaults", async () => {
    await expect(getSettings(userId)).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it("stores saved settings and returns them on the next read", async () => {
    const settings: Settings = {
      weekStartsOn: 0,
      timeZone: "America/New_York",
      defaultReminders: [{ id: crypto.randomUUID(), kind: "offset", amount: 1, unit: "days" }],
      allDayReminderTime: "08:30",
    };
    await expect(saveSettings(userId, settings)).resolves.toEqual(settings);
    await expect(getSettings(userId)).resolves.toEqual(settings);
  });

  it("keeps an emptied list of default reminders empty", async () => {
    await saveSettings(userId, { ...DEFAULT_SETTINGS, defaultReminders: [] });
    await expect(getSettings(userId)).resolves.toMatchObject({ defaultReminders: [] });
  });

  it("keeps settings when the user signs in again", async () => {
    await saveSettings(userId, { ...DEFAULT_SETTINGS, weekStartsOn: 6 });
    await upsertUserForAccount({
      provider: "google",
      providerAccountId: "42",
      email: null,
      name: "Grace Hopper",
      image: null,
    });
    await expect(getSettings(userId)).resolves.toEqual({ ...DEFAULT_SETTINGS, weekStartsOn: 6 });
  });

  it("answers 404 for an unknown user", async () => {
    await expect(getSettings("nobody")).rejects.toBeInstanceOf(HttpError);
    await expect(saveSettings("nobody", DEFAULT_SETTINGS)).rejects.toMatchObject({ status: 404 });
  });
});
