import { randomUUID } from "node:crypto";
import { connectDb } from "@/lib/db/connect";
import { UserModel } from "@/lib/db/models/user";
import { isDuplicateKeyError } from "./errors";

export interface AccountProfile {
  provider: string;
  providerAccountId: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

/** Finds the user behind a sign-in identity, creating them on first sign-in. Returns the user id. */
export async function upsertUserForAccount(profile: AccountProfile): Promise<string> {
  await connectDb();
  try {
    return await upsert(profile);
  } catch (error) {
    // Two first sign-ins at once (e.g. two tabs) both try to insert; the loser retries and
    // matches the winner's document. MongoDB doesn't retry this itself for $elemMatch filters.
    if (isDuplicateKeyError(error)) return upsert(profile);
    throw error;
  }
}

async function upsert({ provider, providerAccountId, email, name, image }: AccountProfile) {
  const user = await UserModel.findOneAndUpdate(
    { accounts: { $elemMatch: { provider, providerAccountId } } },
    {
      $set: { email, name, image },
      $setOnInsert: { _id: randomUUID(), accounts: [{ provider, providerAccountId }] },
    },
    { upsert: true, returnDocument: "after", lean: true },
  );
  if (!user) throw new Error("User upsert returned no document");
  return user._id;
}
