import { requireUserId, route } from "@/lib/api/route";
import type { NotificationsResponse } from "@/lib/domain/notifications";
import { listNotifications } from "@/lib/server/notifications";

/** Reminders sent to the user in the last 30 days, newest first. */
export const GET = route(async () => {
  const userId = await requireUserId();
  return Response.json({
    notifications: await listNotifications(userId),
  } satisfies NotificationsResponse);
});
