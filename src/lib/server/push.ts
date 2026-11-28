import { createHash } from "node:crypto";
import { sendNotification, WebPushError } from "web-push";
import { connectDb } from "@/lib/db/connect";
import { PushSubscriptionModel } from "@/lib/db/models/push-subscription";
import type { PushMessage, PushSubscriptionJson } from "@/lib/domain/push";
import { env } from "@/lib/env";

export type PushResult =
  | { status: "delivered" }
  /** The browser unsubscribed or the subscription expired: forget it. */
  | { status: "gone" }
  | { status: "failed"; error: string };

export interface PushSender {
  send(
    subscription: PushSubscriptionJson,
    payload: string,
    options: { topic: string; ttlSeconds: number },
  ): Promise<PushResult>;
}

/** Sends through each browser's push service with this server's VAPID keys. */
export function webPushSender(vapid: NonNullable<typeof env.vapid>): PushSender {
  return {
    async send(subscription, payload, { topic, ttlSeconds }) {
      try {
        await sendNotification(subscription, payload, {
          vapidDetails: vapid,
          TTL: ttlSeconds,
          topic,
          urgency: "high",
          // The standard encoding (RFC 8291); Safari accepts no other.
          contentEncoding: "aes128gcm",
          timeout: 10_000,
        });
        return { status: "delivered" };
      } catch (error) {
        if (
          error instanceof WebPushError &&
          (error.statusCode === 404 || error.statusCode === 410)
        ) {
          return { status: "gone" };
        }
        const detail =
          error instanceof WebPushError
            ? `${error.statusCode} ${error.body}`.trim()
            : String(error);
        return { status: "failed", error: detail };
      }
    },
  };
}

/** The sender for this server's configuration, or null when push isn't set up. */
export function configuredPushSender(): PushSender | null {
  const vapid = env.vapid;
  return vapid ? webPushSender(vapid) : null;
}

/**
 * Push services keep one undelivered message per topic: a resend of the same reminder (after
 * a crash between sending and recording it) replaces the first instead of adding a second.
 * Topics are at most 32 URL-safe characters.
 */
export function pushTopic(notificationId: string): string {
  return createHash("sha256").update(notificationId).digest("base64url").slice(0, 32);
}

export type PushOutcome = "delivered" | "no-devices" | "retry";

/**
 * Sends the message to every device of the user. Forgets the ones that are gone. "retry"
 * means no device got it but some may yet, after a temporary failure.
 */
export async function pushToUser(
  userId: string,
  message: PushMessage,
  sender: PushSender,
  ttlSeconds: number,
): Promise<{ outcome: PushOutcome; error: string | null }> {
  await connectDb();
  const devices = await PushSubscriptionModel.find({ userId }).lean();
  const payload = JSON.stringify(message);
  const topic = pushTopic(message.notificationId);
  let delivered = 0;
  let error: string | null = null;

  for (const device of devices) {
    const subscription = { endpoint: device._id, keys: device.keys };
    const result = await sender.send(subscription, payload, { topic, ttlSeconds });
    if (result.status === "delivered") delivered++;
    else if (result.status === "gone") await PushSubscriptionModel.deleteOne({ _id: device._id });
    else error = result.error;
  }

  if (delivered > 0) return { outcome: "delivered", error };
  return { outcome: error === null ? "no-devices" : "retry", error };
}

/** Registers a device for the user. A browser that another account used moves to this one. */
export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionJson,
  now = new Date(),
): Promise<void> {
  await connectDb();
  await PushSubscriptionModel.updateOne(
    { _id: subscription.endpoint },
    { $set: { userId, keys: subscription.keys, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
}

export async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
  await connectDb();
  await PushSubscriptionModel.deleteOne({ _id: endpoint, userId });
}
