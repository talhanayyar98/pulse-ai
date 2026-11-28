"use server";

import { DEV_PROVIDER_ID, signIn, signOut } from "@/auth";

export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/board" });
}

export async function signInAsDevUser(): Promise<void> {
  await signIn(DEV_PROVIDER_ID, { redirectTo: "/board" });
}

/** Ends the session without redirecting: the client reloads into /signin once it has cleaned up. */
export async function signOutUser(): Promise<void> {
  await signOut({ redirect: false });
}
