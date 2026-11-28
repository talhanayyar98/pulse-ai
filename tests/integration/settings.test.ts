import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDb } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models/user";
import { DEFAULT_SETTINGS } from "@/lib/domain/settings";
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

  it("stores a saved week start and returns it on the next read", async () => {
    await expect(saveSettings(userId, { weekStartsOn: 0 })).resolves.toEqual({ weekStartsOn: 0 });
    await expect(getSettings(userId)).resolves.toEqual({ weekStartsOn: 0 });
  });

  it("keeps settings when the user signs in again", async () => {
    await saveSettings(userId, { weekStartsOn: 6 });
    await upsertUserForAccount({
      provider: "google",
      providerAccountId: "42",
      email: null,
      name: "Grace Hopper",
      image: null,
    });
    await expect(getSettings(userId)).resolves.toEqual({ weekStartsOn: 6 });
  });

  it("answers 404 for an unknown user", async () => {
    await expect(getSettings("nobody")).rejects.toBeInstanceOf(HttpError);
    await expect(saveSettings("nobody", DEFAULT_SETTINGS)).rejects.toMatchObject({ status: 404 });
  });
});
