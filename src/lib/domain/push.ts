import { z } from "zod";

/** A browser's push subscription, as `PushSubscription.toJSON()` gives it. */
export const pushSubscriptionSchema = z.object({
  // Push services are HTTPS endpoints; anything else is not a subscription.
  endpoint: z.url({ protocol: /^https$/ }).max(2048),
  keys: z.object({ p256dh: z.string().min(1).max(512), auth: z.string().min(1).max(512) }),
});
export type PushSubscriptionJson = z.infer<typeof pushSubscriptionSchema>;

/** POST /api/push/subscriptions. */
export const savePushSubscriptionSchema = z.object({ subscription: pushSubscriptionSchema });
/** DELETE /api/push/subscriptions. */
export const deletePushSubscriptionSchema = z.object({ endpoint: z.string().min(1).max(2048) });

/** GET /api/push: the VAPID public key, or null when this server can't send pushes. */
export const pushConfigSchema = z.object({ publicKey: z.string().nullable() });
export type PushConfig = z.infer<typeof pushConfigSchema>;

/** The JSON payload of a push message, read by the service worker. */
export interface PushMessage {
  kind: "reminder";
  /** The in-app notification it matches; also the system notification's tag. */
  notificationId: string;
  taskId: string;
  title: string;
  body: string;
  /** Opened when the notification is clicked and no Pulse window is open. */
  url: string;
}

/** What the service worker tells open windows. */
export type ServiceWorkerNotice =
  { type: "pulse:notification" } | { type: "pulse:open-task"; taskId: string };
