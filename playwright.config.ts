import { defineConfig, devices } from "@playwright/test";
import { e2eServerEnv } from "./tests/e2e/env";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  // The smoke test is one user journey against one database: never run copies in parallel.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // The service worker only runs in production builds, so the smoke test needs one.
  // Requires MongoDB on 127.0.0.1:27017 (see README → Local setup).
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}/board`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: e2eServerEnv,
  },
});
