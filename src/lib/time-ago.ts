const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** Compact age for notification lists: "Just now", "5m", "3h", "2d", "4w". */
export function formatAgo(at: Date, now: Date): string {
  const elapsed = now.getTime() - at.getTime();
  if (elapsed < MINUTE) return "Just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < WEEK) return `${Math.floor(elapsed / DAY)}d`;
  return `${Math.floor(elapsed / WEEK)}w`;
}
