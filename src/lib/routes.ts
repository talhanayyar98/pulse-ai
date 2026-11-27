export const APP_VIEWS = [
  { href: "/board", label: "Board" },
  { href: "/week", label: "Week" },
  { href: "/month", label: "Month" },
] as const;

export type AppView = (typeof APP_VIEWS)[number];
export type AppViewHref = AppView["href"];

export const OFFLINE_FALLBACK_URL = "/~offline";

/** Opened by the "New task" app shortcut; the board opens quick-add when it sees `?new=1`. */
export const NEW_TASK_URL = "/board?new=1";
