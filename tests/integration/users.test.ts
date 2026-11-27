import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectDb } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models/user";
import { upsertUserForAccount } from "@/lib/server/users";

beforeAll(async () => {
  await connectDb();
  await UserModel.deleteMany({});
  await UserModel.init(); // the unique index on accounts is what makes the race observable
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("upsertUserForAccount", () => {
  const profile = {
    provider: "google",
    providerAccountId: "1234567890",
    email: "ada@example.com",
    name: "Ada",
    image: null,
  };

  it("creates exactly one user when several first sign-ins race", async () => {
    const ids = await Promise.all(Array.from({ length: 5 }, () => upsertUserForAccount(profile)));
    expect(new Set(ids).size).toBe(1);
    expect(await UserModel.countDocuments()).toBe(1);
  });

  it("returns the same user on later sign-ins and refreshes the profile", async () => {
    const first = await upsertUserForAccount(profile);
    const again = await upsertUserForAccount({ ...profile, name: "Ada Lovelace" });
    expect(again).toBe(first);
    expect((await UserModel.findById(first).lean())?.name).toBe("Ada Lovelace");
  });
});
