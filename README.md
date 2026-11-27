# Pulse

A keyboard-first task manager that installs as a desktop app on macOS and works on mobile: Kanban board, week planner and month calendar, with reminders that arrive even when the app is closed.

Built with Next.js (App Router), TypeScript, Tailwind CSS v4, Motion and Serwist.

## Requirements

- Node.js 24+ (`.nvmrc` pins the major version)
- npm 11+

## Local setup

```bash
npm install
npm run dev          # http://localhost:3000
```

The service worker is **disabled in `npm run dev`** so cached files never hide code changes. To try the installable, offline-capable app, run a production build:

```bash
npm run build
npm start            # http://localhost:3000
```

## Scripts

| Script              | What it does                                                   |
| ------------------- | -------------------------------------------------------------- |
| `npm run dev`       | Dev server (Turbopack)                                         |
| `npm run build`     | Production build, including the service worker                 |
| `npm start`         | Serve the production build                                     |
| `npm run typecheck` | Generate route types, then `tsc --noEmit`                      |
| `npm run lint`      | ESLint, zero warnings allowed                                  |
| `npm run format`    | Prettier (with Tailwind class sorting)                         |
| `npm test`          | Vitest unit tests                                              |
| `npm run test:e2e`  | Playwright smoke test (builds and serves the app on port 3100) |
| `npm run check`     | typecheck + lint + format check + unit tests                   |
| `npm run icons`     | Regenerate every app icon from `assets/brand/*.svg`            |

First Playwright run on a new machine: `npx playwright install chromium`.

## Design tokens

The whole palette lives in one place: the `@theme` block in [`src/app/globals.css`](src/app/globals.css). Three hues only (black base, purple brand, neon accent), text in white at fixed opacities. `tests/unit/tokens.test.ts` fails if a change breaks WCAG AA contrast or drifts from the values the manifest and icons use (`src/lib/theme.ts`).

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
