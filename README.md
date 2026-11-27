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

## How data flows

- **Reads:** `GET /api/tasks` returns the signed-in user's tasks. View pages are static shells, so the data always loads in the browser (this is what lets the app shell work offline).
- **Writes:** every change sends the full task to `POST /api/sync`. The server keeps whichever version has the newer `updatedAt` (last-write-wins), so replaying a write is harmless. Deletes are soft (`deletedAt`), so other devices learn about them.
- **Optimistic UI:** the screen shows server data plus your unsaved edits (`src/lib/client/pending.ts`), so changes appear instantly and fast successive edits never overwrite each other.
- **One write path on the server:** `putTask` in `src/lib/server/task-service.ts` enforces ownership and last-write-wins, and logs activity events (`activity_events`: created, moved, completed, reopened, rescheduled, updated, deleted) for the Phase 2 nudges.

## Design tokens

The whole palette lives in one place: the `@theme` block in [`src/app/globals.css`](src/app/globals.css). Three hues only (black canvas, purple brand, neon accent), text in white at fixed opacities. `tests/unit/tokens.test.ts` fails if a change breaks WCAG AA contrast or drifts from the values the manifest and icons use (`src/lib/theme.ts`).

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
