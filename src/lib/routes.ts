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

/**
 * Query parameters of links into the board (`?new=1`, `?task=<id>`). The service worker
 * ignores them when it looks a page up in its precache, so those links open offline too.
 */
export const BOARD_LINK_PARAMS = ["new", "task"] as const;
