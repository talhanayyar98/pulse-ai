import { timingSafeEqual } from "node:crypto";
import { route } from "@/lib/api/route";
import { env } from "@/lib/env";
import { dispatchDueReminders } from "@/lib/server/dispatch";
import { HttpError } from "@/lib/server/errors";
import { sweepOverdue } from "@/lib/server/overdue";

function sameSecret(given: string | null, expected: string): boolean {
  const a = Buffer.from(given ?? "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * One run of the worker's jobs, for hosts without a long-running process: an external
 * scheduler (or Vercel Cron) calls it every minute with `Authorization: Bearer $CRON_SECRET`.
 * Safe beside the worker: neither sends a reminder the other already claimed.
 */
export const GET = route(async (request) => {
  const secret = env.cronSecret;
  if (!secret) throw new HttpError(404, "Not found");
  if (!sameSecret(request.headers.get("authorization"), `Bearer ${secret}`)) {
    throw new HttpError(401, "Unauthorized");
  }
  const now = new Date();
  const reminders = await dispatchDueReminders({ now });
  const overdue = await sweepOverdue(now);
  return Response.json({ reminders, overdue });
});
