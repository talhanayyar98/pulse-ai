"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { pushSubscriptionSchema } from "@/lib/domain/push";
import { useToasts } from "@/lib/stores/toasts";
import { api } from "./api";

/**
 * Whether this device gets reminders while Pulse is closed:
 * - unsupported: the browser has no Web Push, or there is no service worker (`next dev`);
 * - unconfigured: the server has no VAPID keys, so it sends no pushes;
 * - prompt / denied: the browser's permission, not asked yet or refused;
 * - off / on: permission granted, and this device subscribed or not.
 */
export type PushState =
  "checking" | "unsupported" | "unconfigured" | "prompt" | "denied" | "off" | "on";

interface PushStore {
  state: PushState;
  busy: boolean;
  /** An edit just gave a task a reminder: the moment to offer notifications. */
  offered: boolean;
  /** "Not now" on that offer, remembered on this device. */
  promptDismissed: boolean;
  /** Re-reads the state; with `sync`, registers an existing subscription with the server again. */
  refresh: (options?: { sync?: boolean }) => Promise<void>;
  /** Subscribes this device, asking for permission first if needed. Call it from a click. */
  enable: () => Promise<void>;
  /** Unsubscribes this device (also when signing out). */
  disable: () => Promise<void>;
  offer: () => void;
  dismissPrompt: () => void;
}

/** undefined until fetched (or while the server can't be reached); null when push is off there. */
let publicKey: string | null | undefined;

function isSupported(): boolean {
  return "Notification" in window && "PushManager" in window && "serviceWorker" in navigator;
}

/** The VAPID key as the bytes `subscribe` wants (base64url in, as web-push prints it). */
function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!isSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

async function readState(): Promise<{ state: PushState; subscription: PushSubscription | null }> {
  if (!isSupported() || !(await navigator.serviceWorker.getRegistration())) {
    return { state: "unsupported", subscription: null };
  }
  if (publicKey === undefined) publicKey = await api.pushPublicKey().catch(() => undefined);
  const subscription = await currentSubscription();
  if (subscription) return { state: "on", subscription };
  if (publicKey === null) return { state: "unconfigured", subscription };
  if (Notification.permission === "denied") return { state: "denied", subscription };
  return { state: Notification.permission === "granted" ? "off" : "prompt", subscription };
}

async function register(subscription: PushSubscription): Promise<void> {
  await api.savePushSubscription(pushSubscriptionSchema.parse(subscription.toJSON()));
}

export const usePush = create<PushStore>()(
  persist(
    (set, get) => ({
      state: "checking",
      busy: false,
      offered: false,
      promptDismissed: false,

      async refresh({ sync = false } = {}) {
        const { state, subscription } = await readState();
        set({ state });
        // Keeps the server's copy current, and moves this browser to whoever is signed in now.
        if (sync && subscription) await register(subscription).catch(() => undefined);
      },

      async enable() {
        if (get().busy) return;
        set({ busy: true });
        try {
          publicKey ??= await api.pushPublicKey();
          if (publicKey === null) {
            set({ state: "unconfigured" });
            return;
          }
          const registration = await navigator.serviceWorker.ready;
          // Shows the browser's permission prompt when it hasn't been answered yet.
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBytes(publicKey),
          });
          await register(subscription);
          set({ state: "on" });
        } catch {
          // Refused or dismissed prompts end up here too; only a real failure deserves a toast.
          if (Notification.permission === "granted") {
            useToasts.getState().push({
              title: "Couldn't turn on notifications",
              description: "Check your connection and try again.",
            });
          }
          await get().refresh();
        } finally {
          set({ busy: false });
        }
      },

      async disable() {
        set({ busy: true });
        try {
          const subscription = await currentSubscription();
          if (subscription) {
            // If the server can't be told now, its next push fails as "gone" and it forgets us.
            await api.deletePushSubscription(subscription.endpoint).catch(() => undefined);
            await subscription.unsubscribe();
          }
          await get().refresh();
        } finally {
          set({ busy: false });
        }
      },

      offer: () => set({ offered: true }),
      dismissPrompt: () => set({ promptDismissed: true, offered: false }),
    }),
    {
      name: "pulse:push",
      version: 1,
      // The app shell is statically rendered; PushSync rehydrates after mount.
      skipHydration: true,
      partialize: (state) => ({ promptDismissed: state.promptDismissed }),
    },
  ),
);
