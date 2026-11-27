"use server";

import { DEV_PROVIDER_ID, signIn, signOut } from "@/auth";

export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/board" });
}

export async function signInAsDevUser(): Promise<void> {
  await signIn(DEV_PROVIDER_ID, { redirectTo: "/board" });
}

export async function signOutUser(): Promise<void> {
  await signOut({ redirectTo: "/signin" });
}
