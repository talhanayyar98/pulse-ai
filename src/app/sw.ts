import { defaultCache } from "@serwist/turbopack/worker";
import { NetworkOnly, type PrecacheEntry, Serwist, type SerwistGlobalConfig } from "serwist";
import type { PushMessage, ServiceWorkerNotice } from "@/lib/domain/push";
import { BOARD_LINK_PARAMS, OFFLINE_FALLBACK_URL } from "@/lib/routes";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** Where earlier versions kept API responses (Serwist's default for /api/*). */
const LEGACY_API_CACHE = "apis";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // `/board?task=…` (a notification click) is the precached `/board`, so it opens offline.
  precacheOptions: {
    ignoreURLParametersMatching: [
      /^utm_/,
      /^fbclid$/,
      ...BOARD_LINK_PARAMS.map((param) => new RegExp(`^${param}$`)),
    ],
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // The app keeps the user's data offline itself, in IndexedDB (cleared on sign-out). A
    // second copy here would outlive sign-out and could answer with older data than that.
    {
      matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: OFFLINE_FALLBACK_URL,
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.delete(LEGACY_API_CACHE));
});

function readMessage(event: PushEvent): PushMessage | null {
  try {
    const data: unknown = event.data?.json();
    if (typeof data !== "object" || data === null) return null;
    const message = data as Partial<PushMessage>;
    const fields = [message.notificationId, message.taskId, message.title, message.body];
    const valid = message.kind === "reminder" && fields.every((field) => typeof field === "string");
    return valid && typeof message.url === "string" ? (message as PushMessage) : null;
  } catch {
    return null;
  }
}

async function tellWindows(notice: ServiceWorkerNotice): Promise<void> {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windows) client.postMessage(notice);
}

/** Data kept on a shown notification, read back when it's clicked. */
interface NotificationData {
  url: string;
  taskId: string;
}

// Every push shows a notification, even with Pulse open and in front: browsers expect one for
// each push (Safari withdraws the permission otherwise). Open windows also get a toast.
self.addEventListener("push", (event) => {
  const message = readMessage(event);
  const shown = message
    ? self.registration.showNotification(message.title, {
        body: message.body,
        // A resent reminder replaces its first notification instead of adding a second.
        tag: message.notificationId,
        icon: "/icons/icon-192.png",
        data: { url: message.url, taskId: message.taskId } satisfies NotificationData,
      })
    : self.registration.showNotification("Pulse", { body: "You have a new reminder." });
  // Open windows hear of it even if the notification can't be shown (permission withdrawn).
  event.waitUntil(Promise.allSettled([shown, tellWindows({ type: "pulse:notification" })]));
});

function isNotificationData(data: unknown): data is NotificationData {
  return (
    typeof data === "object" &&
    data !== null &&
    "url" in data &&
    typeof data.url === "string" &&
    "taskId" in data &&
    typeof data.taskId === "string"
  );
}

/** Opens the task in the Pulse window already open (focusing it), or in a new one. */
async function openTask({ url, taskId }: NotificationData): Promise<void> {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const target = windows.find((client) => client.focused) ?? windows[0];
  if (target) {
    await target.focus();
    target.postMessage({ type: "pulse:open-task", taskId } satisfies ServiceWorkerNotice);
    return;
  }
  await self.clients.openWindow(url);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data: unknown = event.notification.data;
  event.waitUntil(isNotificationData(data) ? openTask(data) : self.clients.openWindow("/board"));
});

serwist.addEventListeners();
