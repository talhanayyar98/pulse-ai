# Pulse

A keyboard-first task manager that installs as a desktop app on macOS and works on mobile: Kanban board, week planner and month calendar, with reminders that arrive even when the app is closed.

Built with Next.js (App Router), TypeScript, Tailwind CSS v4, Motion and Serwist.

## Requirements

- Node.js 24+ (`.nvmrc` pins the major version)
- npm 11+
- MongoDB 6+ on `127.0.0.1:27017`: `docker compose up -d` starts one, or use an existing local install (e.g. Homebrew `mongodb-community`)

## Local setup

```bash
npm install
cp .env.example .env.local
# put a secret in AUTH_SECRET:  openssl rand -base64 32
docker compose up -d   # skip if MongoDB already runs locally
npm run dev            # http://localhost:3000
```

Sign in with **Continue as dev user**. It appears when `AUTH_DEV_LOGIN=true` and needs no Google setup. Never enable it in production.

The service worker is **disabled in `npm run dev`** so cached files never hide code changes. To try the installable, offline-capable app, run a production build:

```bash
npm run build
npm start              # http://localhost:3000
```

### Environment variables

Every variable is listed and explained in [`.env.example`](.env.example).

| Variable                                 | Purpose                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `MONGODB_URI`                            | MongoDB connection string                                                        |
| `AUTH_SECRET`                            | Encrypts session cookies (`openssl rand -base64 32`)                             |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`  | Google sign-in; the button only shows when both are set                          |
| `AUTH_TRUST_HOST`                        | `true` when you run `next start` yourself (locally or behind a proxy)            |
| `AUTH_DEV_LOGIN`                         | `true` enables the one-click dev user for local work and e2e tests               |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push keys (`npx web-push generate-vapid-keys`); without them no push is sent |
| `VAPID_SUBJECT`                          | Contact for push services: a real `mailto:` address or an `https` URL            |
| `CRON_SECRET`                            | Enables `GET /api/cron/tick` for hosts without a worker process                  |

### Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**, create an **OAuth client ID** of type **Web application**.
2. Add the authorised redirect URI `http://localhost:3000/api/auth/callback/google` (plus your production origin's equivalent later).
3. Put the client ID and secret in `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`, then restart the dev server.

## Scripts

| Script                     | What it does                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm run dev`              | Dev server (Turbopack)                                                                                  |
| `npm run build`            | Production build, including the service worker                                                          |
| `npm start`                | Serve the production build                                                                              |
| `npm run worker`           | The reminder worker: sends due reminders, logs overdue tasks                                            |
| `npm run typecheck`        | Generate route types, then `tsc --noEmit`                                                               |
| `npm run lint`             | ESLint, zero warnings allowed                                                                           |
| `npm run format`           | Prettier (with Tailwind class sorting)                                                                  |
| `npm test`                 | Vitest unit tests (no database needed)                                                                  |
| `npm run test:integration` | Vitest tests against MongoDB (throwaway `pulse_test` database)                                          |
| `npm run test:e2e`         | Playwright smoke test: builds, serves on port 3100, uses `pulse_e2e` (full Chromium, new headless mode) |
| `npm run check`            | typecheck + lint + format check + unit tests                                                            |
| `npm run icons`            | Regenerate every app icon from `assets/brand/*.svg`                                                     |

Integration and e2e tests need MongoDB running. First Playwright run on a new machine: `npx playwright install chromium`. The smoke test simulates a push with the Chrome DevTools Protocol and runs the reminder jobs through `/api/cron/tick`, so it needs neither VAPID keys nor a worker.

## Using the board

| Action                     | Mouse / trackpad    | Touch                 | Keyboard                                                          |
| -------------------------- | ------------------- | --------------------- | ----------------------------------------------------------------- |
| New task                   | **New task** button | Round **+** button    | `N`                                                               |
| Search tasks, switch views | **Search** button   | Search icon           | `⌘K` / `Ctrl+K`                                                   |
| Open a task                | Click the card      | Tap the card          | `Tab` to the card, `Enter`                                        |
| Move or reorder a task     | Drag the card       | Long-press, then drag | `Space` to lift, arrows to move, `Space` to drop, `Esc` to cancel |
| Close the palette / drawer | Click outside       | Tap outside           | `Esc`                                                             |

In quick add, `#label` adds a label and `!low` / `!med` / `!high` / `!urgent` sets the priority, e.g. `Pay rent #home !urgent`.

- **Filters** (above the board): All / This week / This month, plus priority and label chips. "This week" means planned for this week _or_ due this week; "This month" includes everything in this week. Overdue tasks always show. Filters are remembered on each device.
- **Done** shows the last 7 days; older completed tasks fold into a toggle at the bottom of the column.
- **Overdue** cards get a pulsing rose edge, and the count appears next to the Board title, on the Board nav item and, when the app is installed, on its Dock icon. Tasks due within 24 hours show their date in amber.
- **Notifications** (the bell, top of the sidebar or mobile top bar): reminders that were sent (the last 30 days), overdue tasks, tasks due within 24 hours, tasks in progress for 7+ days, and tasks finished in the last 24 hours. Reminders come from the server; the rest are worked out on the device from your tasks. The red count shows what arrived since you last opened the panel; opening it clears the count, and items stay highlighted until you open them or **Mark all as read**. Seen/read state is kept per device and cleared on sign-out.

## Reminders

Reminders arrive as system notifications even when Pulse is closed, and as a toast plus an entry in the bell while it's open.

### Setting them

- Every task with a due date gets your **default reminders** (out of the box: 1 hour before). Change them in **Settings → Reminders**; tasks that use the defaults follow the change.
- In the task drawer, **Remind** has a toggle per lead time: _Due time, 5 min, 15 min, 30 min, 1 hr, 2 hr, 1 day, 2 days, 1 wk_ (for all-day tasks: _On the day, 1 day, 2 days, 1 wk_). Changing them gives the task its own reminders; **Use my defaults** goes back.
- **At a set time** adds a reminder for an exact moment. It doesn't need a due date. On a repeating task it moves with each occurrence (the evening before stays the evening before).
- Up to five reminders per task. Under the toggles the drawer shows when the next one fires.
- **All-day tasks** are reminded relative to a time on their day, 09:00 unless you change it in Settings: _On the day_ is 09:00, _1 day before_ is 09:00 the day before, and _1 hr_ is 08:00.
- Days and weeks keep the time on the clock across daylight-saving changes; minutes and hours are exact.
- The **time zone** reminders are worked out in is saved to your account from the first device you use. Settings shows it, and offers to switch when the device you're on is elsewhere.

### What happens to them

- Changing the due date moves its reminders. Finishing or deleting a task cancels them; a repeating task's next occurrence gets its own.
- A reminder set for a time that has already passed doesn't fire. An edit made offline before a reminder's time still reminds you once it syncs, up to 12 hours late; after that it's dropped.
- Clicking a notification opens Pulse on that task: in the window that's already open, or a new one.

### Turning on notifications on a device

Pulse asks at the moment it's useful: after you give a task a reminder, a card offers **Turn on notifications**. It's also in **Settings → Notifications** and in the drawer. The browser's own permission prompt appears when you click (Safari requires that).

- Each browser or installed app is a separate device. Signing out turns notifications off on that device.
- **Chrome / Edge on macOS:** notifications arrive while Chrome is running, even with no Pulse window open. If Chrome has fully quit, they appear the next time it starts. macOS must allow notifications from Chrome (System Settings → Notifications).
- **Safari on macOS (Sonoma or later):** works in Safari and in a Safari web app (**Add to Dock**). Each has its own permission.
- **iPhone / iPad:** only in the installed app: Share → **Add to Home Screen**, open it from there, then turn notifications on.
- **Blocked by mistake?** Allow notifications for the site in the browser's site settings, then reload.

### Running it locally

1. Generate VAPID keys once and put them in `.env.local` with a real contact:

   ```bash
   npx web-push generate-vapid-keys
   # VAPID_PUBLIC_KEY=…  VAPID_PRIVATE_KEY=…  VAPID_SUBJECT=mailto:you@example.com
   ```

2. Push needs the service worker, which only runs in a production build: `npm run build && npm start`.
3. In a second terminal, start the worker: `npm run worker`. It checks for due reminders every 20 seconds and logs what it sends.
4. Open http://localhost:3000, turn on notifications, and give a task a reminder **At a set time** a minute or two ahead.

Without VAPID keys everything still works except the system notification: reminders reach the bell and appear as toasts while Pulse is open. In `npm run dev` there is no service worker, so Settings says the browser can't receive notifications.

## Deploying

Pulse is two processes from this repository, plus MongoDB:

| Process | Command          | Does                                                         |
| ------- | ---------------- | ------------------------------------------------------------ |
| web     | `npm start`      | The app and its API (after `npm run build`)                  |
| worker  | `npm run worker` | Sends due reminders every 20 s; logs overdue tasks every min |

The recommended setup is both processes on a host that keeps them running (Railway, Fly.io or a small VPS), with MongoDB on Atlas's free tier:

1. Create a MongoDB Atlas cluster and put its connection string in `MONGODB_URI`.
2. Set the same environment on both processes: `MONGODB_URI`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, the Google sign-in pair, and the three `VAPID_*` values. Don't set `AUTH_DEV_LOGIN`.
3. Web: build with `npm ci && npm run build`, start with `npm start`. Worker: `npm ci`, start with `npm run worker`. The worker reads `.env.local` only if one exists; on a host, environment variables do the job.
4. Serve the web process over HTTPS (push, service workers and installing all need it) and add `https://<your domain>/api/auth/callback/google` to the Google OAuth client.

Running two copies of the worker (for example during a deploy) is safe: each reminder is claimed by exactly one of them.

**Without a worker process** (for example Vercel Hobby, whose own cron runs at most once a day): set `CRON_SECRET` and have an external scheduler such as cron-job.org call `GET /api/cron/tick` every minute with the header `Authorization: Bearer <CRON_SECRET>`. Reminders then arrive up to a minute late, and depend on that service.

## Planning the week and month

| Action                 | Mouse / trackpad                                              | Touch                                                       | Keyboard                                                                  |
| ---------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| Give a task a day      | Drag it from **Unscheduled** (Week) onto a day                | Long-press, then drag                                       | `Space` to lift, arrows to choose a day, `Space` to drop, `Esc` to cancel |
| Move it to another day | Drag it (Week or Month)                                       | Long-press, then drag                                       | As above; in Month `←` `→` move a day and `↑` `↓` a week                  |
| Clear its date         | Drag it back onto **Unscheduled** (Week)                      | Long-press, then drag                                       | As above                                                                  |
| Add a task on a day    | **+** on the day (Week), or click a day's empty space (Month) | **+** on the day (Week), or tap a day, then **Add** (Month) | `Tab` to the day's add button, `Enter`                                    |
| Change week or month   | **‹** / **Today** / **›** above the days                      | Same                                                        | Same                                                                      |

- Weeks start on the day you choose in **Settings** (the sliders icon by your avatar, or search "Settings" with `⌘K`): Monday, Sunday or Saturday. It's saved to your account, so every device agrees, and the board's "This week" filter follows it.
- Dropping a timed task keeps its time of day; an all-day or undated task becomes due all day.
- **Unscheduled** lists open tasks without a date: planned for this week first, then this month, then the rest.
- Week and Month keep your place when you switch between them. In Month, **+N more** on a busy day opens that week.

### Repeating tasks

- In the task drawer, **Repeat** sets a task to repeat weekly on chosen weekdays or monthly on chosen days of the month, every 1 to 12 weeks or months. A day past the end of a shorter month (say the 31st) falls on its last day.
- A repeat needs a due date: choosing one for an undated task makes it due today, and clearing the date ends the repeat.
- A repeating task has one real task at a time. Completing it (in the drawer, or by dragging it to Done) adds the next one to To Do with its subtasks unticked. If you complete it late, the next one is scheduled from today rather than in the past. Reopening the completed task takes that next one back, as long as you haven't changed it.
- Upcoming repeats appear as dashed chips in Week and Month; clicking one opens the current task.
- Dates are worked out in your local time, so "Mondays 09:00" stays at 09:00 when the clocks change.

## Working offline

Pulse keeps your tasks on the device, so the installed app opens and works without a connection.

- **What's kept:** the tasks, settings, sent reminders and session from your last sync, in IndexedDB. Views open with them straight away and refresh as soon as there's a connection.
- **Editing offline:** adding, editing, moving, completing and deleting all work. Each change shows at once and waits in an outbox on the device. It survives reloads and closing the app, and syncs by itself when the connection returns, without a reload.
- **Sync status** sits at the bottom of the sidebar. On phones, an icon appears in the top bar while something is waiting.

  | It says                   | Meaning                                                                                                                                                              |
  | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | All changes synced        | The server has everything                                                                                                                                            |
  | Syncing 2 tasks…          | Edits are on their way                                                                                                                                               |
  | Offline · 2 tasks to sync | No connection; the edits wait on this device                                                                                                                         |
  | Can't reach Pulse · Retry | Online, but the server didn't answer. Pulse retries after 1 s, 2 s, 4 s … (at most 30 s apart), and at once when you click **Retry**, return to the app or reconnect |
  | Signed out                | The session ended; sign in again and the waiting edits sync                                                                                                          |

  Toasts announce going offline, trouble reaching the server, and the recovery ("Synced your edits to 2 tasks.").

- **Conflicts:** the newest edit of a task wins (last-write-wins on the time of the edit). If the same task was changed elsewhere after your offline edit, that version is kept and a toast tells you. Edits to different tasks never conflict.
- **Needs a connection:** changing settings (they're saved to your account), turning notifications on or off, and signing out. Signing out first syncs any waiting edits, then removes your data from the device; if the edits can't be synced, you stay signed in.
- **Another account on the same browser:** the previous account's data and unsynced edits are discarded, never shown or sent as the new user's.
- **Several tabs:** each tab syncs its own edits. Edits left in a tab that was closed while offline sync the next time Pulse opens.

## How data flows

- **Reads:** `GET /api/tasks` returns the signed-in user's tasks. View pages are static shells, so the data always loads in the browser (this is what lets the app shell work offline).
- **Writes:** every change goes into the outbox (`src/lib/client/pending.ts`), then to `POST /api/sync` as full task snapshots, up to 100 per request (`src/lib/client/offline/sync-engine.ts`). The server keeps whichever version has the newer `updatedAt` (last-write-wins), so replaying a write is harmless. Deletes are soft (`deletedAt`), so other devices learn about them.
- **Optimistic UI:** the screen shows server data plus the outbox, so changes appear instantly and fast successive edits never overwrite each other. Several edits to one task while offline are sent as one snapshot.
- **On the device** (`src/lib/client/offline/`): an IndexedDB database named `pulse` holds a snapshot of the session, tasks and settings (`kv`) and one queued snapshot per edited task (`outbox`). A synced edit leaves the outbox only once a snapshot with the server's copy has been saved, so a reload always finds it in one or the other. The snapshot records whose data it is; if a different account signs in, both are cleared. Restored data is shown at once and refetched whenever there's a connection.
- **Service worker:** it precaches the app shell but never caches `/api` responses: a second copy there would survive sign-out and could be older than the app's own. It shows a notification for every push (Safari withdraws permission from sites that don't) and tells open windows, which show a toast. Clicking one focuses an open Pulse window and opens the task there, or opens `/board?task=<id>`; that link and the `?new=1` shortcut work offline too.
- **Ordering:** each task has a fractional order key (`src/lib/domain/ordering.ts`). A drop writes one new key between its neighbours, so moving a card never renumbers a column.
- **Repeating tasks:** the next occurrence of a series gets the id `<series id>:<yyyy-MM-dd>` (the series id is the first task's id). Two devices that complete the same occurrence therefore write the same task, settled by last-write-wins, instead of creating two. Upcoming occurrences are worked out on the device and never stored (`src/lib/domain/series.ts`).
- **Settings:** `GET` / `PUT /api/settings` read and replace the user's preferences, stored on their user document. A setting the user never saved reads as its default. Saving changed reminder settings reschedules the user's open tasks.
- **Reminders** (`src/lib/server/reminders.ts`, `dispatch.ts`): a task's reminder rules live on the task (`reminders`; `null` means "use the defaults"). After every write that can move them, `putTask` turns them into one `reminders` document per moment a rule fires, adding new future ones and removing ones no longer wanted. Ones already sent stay as history. The worker's `dispatchDueReminders` claims each due reminder with an atomic `findOneAndUpdate` (`pending → sending`, with a 2-minute lease), so it is sent once even with several workers. It checks the task still wants it, records it in `notifications` (what the bell lists, via `GET /api/notifications`), pushes it to every subscribed device (`push_subscriptions`, kept by `POST`/`DELETE /api/push/subscriptions`) and marks it sent. Devices whose subscription has gone (404/410) are forgotten. A temporary push failure is retried on the next run, five tries in all. If a worker dies between sending and recording, the reminder is sent again with the same push topic and notification tag, so the device shows it once.
- **Overdue sweep:** every minute the worker logs one `overdue` activity event per due date an open task misses (for the Phase 2 nudges).
- **One write path on the server:** `putTask` in `src/lib/server/task-service.ts` enforces ownership and last-write-wins, schedules reminders, and logs activity events (`activity_events`: created, moved, completed, reopened, rescheduled, updated, deleted, and the worker's overdue) for the Phase 2 nudges.

## Design tokens

The whole palette ("Atelier") lives in one place: the `@theme` block in [`src/app/globals.css`](src/app/globals.css). Warm ivory paper with white cards, navy navigation chrome (sidebar and mobile bars, with a brass marker on the current view), and terracotta for the brand and primary actions (`bg-cta`). Each board column has its own hue and tint: slate for Backlog, blue for To Do, ochre for In Progress, green for Done. Amber marks due soon and high priority; rose marks overdue and urgent. Labels pick one of six muted hues from their name. Headings use Bebas Neue; everything else uses Inter, task titles included (an all-caps face would hide their casing). `tests/unit/tokens.test.ts` fails if a change breaks WCAG AA contrast (text on paper, tints, navy and coloured badges, plus a visible focus ring) or drifts from the values the manifest and icons use (`src/lib/theme.ts`).

Motion respects the system's reduced-motion setting: CSS animations collapse to their end state and Motion skips transform animations.

## Install on macOS

Use a production build (`npm run build && npm start`) or a deployed HTTPS URL. `localhost` counts as secure, so installing locally works.

### Chrome (or Edge)

1. Open the app in Chrome.
2. Click the **install icon** at the right end of the address bar, or open the **⋮** menu → **Cast, save and share** → **Install page as app…**
   (Edge: **⋯** → **Apps** → **Install this site as an app**.)
3. Pulse opens in its own window and is added to Launchpad and `~/Applications/Chrome Apps`. To keep it in the Dock, right-click its Dock icon → **Options** → **Keep in Dock**.
4. Right-click the Dock icon for the **New task** and **This week** shortcuts.

### Safari (macOS Sonoma 14 or later)

1. Open the app in Safari.
2. Choose **File** → **Add to Dock…** (or the **Share** button → **Add to Dock…**), then confirm the name.
3. Pulse appears in the Dock and in `~/Applications`, and opens in its own window.

Notes for Safari:

- A Safari web app keeps its own cookies and storage, separate from Safari. You sign in again inside the app.
- Safari does not support manifest shortcuts, so the Dock menu has no **New task** or **This week** items.

### Check installability

In Chrome DevTools → **Application** → **Manifest**, the **Installability** section should list no errors. (Lighthouse no longer has a PWA category; this panel is the source of truth.)

### Reset the app during development

DevTools → **Application** → **Storage** → **Clear site data** removes the service worker, its caches and the offline data in IndexedDB (including edits that haven't synced). To look at the offline data instead, open **Application** → **IndexedDB** → **pulse**. To uninstall, open the installed app's **⋮** menu → **Uninstall Pulse** (Chrome) or drag it from `~/Applications` to the Trash (Safari).
