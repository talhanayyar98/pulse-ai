import mongoose from "mongoose";
import cron from "node-cron";
import { connectDb } from "@/lib/db/connect";
import { env } from "@/lib/env";
import { dispatchDueReminders } from "@/lib/server/dispatch";
import { sweepOverdue } from "@/lib/server/overdue";

/*
 * The background worker: `npm run worker`, a long-running process beside the web app.
 * Several copies may run at once (say, during a deploy): reminders are claimed atomically and
 * overdue events are logged once each, so nothing is sent or logged twice.
 */

function log(message: string): void {
  console.log(`[worker] ${new Date().toISOString()} ${message}`);
}

async function sendReminders(): Promise<void> {
  try {
    const { sent, skipped, failed, retrying } = await dispatchDueReminders();
    if (sent + skipped + failed + retrying > 0) {
      log(`reminders: ${sent} sent, ${skipped} skipped, ${failed} failed, ${retrying} retrying`);
    }
  } catch (error) {
    console.error("[worker] reminders failed", error);
  }
}

async function logOverdue(): Promise<void> {
  try {
    const logged = await sweepOverdue();
    if (logged > 0) log(`overdue: ${logged} logged`);
  } catch (error) {
    console.error("[worker] overdue sweep failed", error);
  }
}

await connectDb();
log(
  env.vapid
    ? "started: reminders every 20 s, overdue sweep every minute"
    : "started without VAPID keys: reminders reach the notification centre only, no pushes",
);

const jobs = [
  cron.schedule("*/20 * * * * *", sendReminders, { name: "reminders", noOverlap: true }),
  cron.schedule("0 * * * * *", logOverdue, { name: "overdue", noOverlap: true }),
];

async function stop(signal: string): Promise<void> {
  log(`${signal}: stopping`);
  await Promise.all(jobs.map((job) => job.stop()));
  await mongoose.disconnect();
  process.exit(0);
}

process.once("SIGINT", () => void stop("SIGINT"));
process.once("SIGTERM", () => void stop("SIGTERM"));
