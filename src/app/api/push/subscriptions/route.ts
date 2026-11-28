import { requireUserId, route } from "@/lib/api/route";
import { deletePushSubscriptionSchema, savePushSubscriptionSchema } from "@/lib/domain/push";
import { deletePushSubscription, savePushSubscription } from "@/lib/server/push";

/** Registers this browser for the signed-in user's reminders (sent again on every app start). */
export const POST = route(async (request) => {
  const userId = await requireUserId();
  const { subscription } = savePushSubscriptionSchema.parse(await request.json());
  await savePushSubscription(userId, subscription);
  return new Response(null, { status: 204 });
});

/** Stops pushes to this browser: notifications turned off, or signing out. */
export const DELETE = route(async (request) => {
  const userId = await requireUserId();
  const { endpoint } = deletePushSubscriptionSchema.parse(await request.json());
  await deletePushSubscription(userId, endpoint);
  return new Response(null, { status: 204 });
});
