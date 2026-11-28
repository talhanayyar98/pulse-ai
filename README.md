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

| Variable                                | Purpose                                                               |
| --------------------------------------- | --------------------------------------------------------------------- |
| `MONGODB_URI`                           | MongoDB connection string                                             |
| `AUTH_SECRET`                           | Encrypts session cookies (`openssl rand -base64 32`)                  |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google sign-in; the button only shows when both are set               |
| `AUTH_TRUST_HOST`                       | `true` when you run `next start` yourself (locally or behind a proxy) |
| `AUTH_DEV_LOGIN`                        | `true` enables the one-click dev user for local work and e2e tests    |

### Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**, create an **OAuth client ID** of type **Web application**.
2. Add the authorised redirect URI `http://localhost:3000/api/auth/callback/google` (plus your production origin's equivalent later).
3. Put the client ID and secret in `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`, then restart the dev server.

## Scripts

| Script                     | What it does                                                         |
| -------------------------- | -------------------------------------------------------------------- |
| `npm run dev`              | Dev server (Turbopack)                                               |
| `npm run build`            | Production build, including the service worker                       |
| `npm start`                | Serve the production build                                           |
| `npm run typecheck`        | Generate route types, then `tsc --noEmit`                            |
| `npm run lint`             | ESLint, zero warnings allowed                                        |
| `npm run format`           | Prettier (with Tailwind class sorting)                               |
| `npm test`                 | Vitest unit tests (no database needed)                               |
| `npm run test:integration` | Vitest tests against MongoDB (throwaway `pulse_test` database)       |
| `npm run test:e2e`         | Playwright smoke test: builds, serves on port 3100, uses `pulse_e2e` |
| `npm run check`            | typecheck + lint + format check + unit tests                         |
| `npm run icons`            | Regenerate every app icon from `assets/brand/*.svg`                  |

Integration and e2e tests need MongoDB running. First Playwright run on a new machine: `npx playwright install chromium`.

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
- **Notifications** (the bell, top of the sidebar or mobile top bar): overdue tasks, tasks due within 24 hours, tasks in progress for 7+ days, and tasks finished in the last 24 hours. They are worked out on the device from your tasks. The red count shows what arrived since you last opened the panel; opening it clears the count, and items stay highlighted until you open them or **Mark all as read**. Seen/read state is kept per device and cleared on sign-out.

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

## How data flows

- **Reads:** `GET /api/tasks` returns the signed-in user's tasks. View pages are static shells, so the data always loads in the browser (this is what lets the app shell work offline).
- **Writes:** every change sends the full task to `POST /api/sync`. The server keeps whichever version has the newer `updatedAt` (last-write-wins), so replaying a write is harmless. Deletes are soft (`deletedAt`), so other devices learn about them.
- **Optimistic UI:** the screen shows server data plus your unsaved edits (`src/lib/client/pending.ts`), so changes appear instantly and fast successive edits never overwrite each other.
- **Ordering:** each task has a fractional order key (`src/lib/domain/ordering.ts`). A drop writes one new key between its neighbours, so moving a card never renumbers a column.
- **Repeating tasks:** the next occurrence of a series gets the id `<series id>:<yyyy-MM-dd>` (the series id is the first task's id). Two devices that complete the same occurrence therefore write the same task, settled by last-write-wins, instead of creating two. Upcoming occurrences are worked out on the device and never stored (`src/lib/domain/series.ts`).
- **Settings:** `GET` / `PUT /api/settings` read and replace the user's preferences, stored on their user document. A setting the user never saved reads as its default.
- **One write path on the server:** `putTask` in `src/lib/server/task-service.ts` enforces ownership and last-write-wins, and logs activity events (`activity_events`: created, moved, completed, reopened, rescheduled, updated, deleted) for the Phase 2 nudges.

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

DevTools → **Application** → **Storage** → **Clear site data** removes the service worker and its caches. To uninstall, open the installed app's **⋮** menu → **Uninstall Pulse** (Chrome) or drag it from `~/Applications` to the Trash (Safari).
