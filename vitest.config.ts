import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    // A zone with daylight saving makes local-time tests meaningful and deterministic.
    env: { TZ: "Europe/London" },
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"] },
      },
      {
        // Needs a running MongoDB (README → Local setup); uses a throwaway database.
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          fileParallelism: false,
          env: {
            TZ: "Europe/London",
            MONGODB_URI: process.env.MONGODB_URI_TEST ?? "mongodb://127.0.0.1:27017/pulse_test",
          },
        },
      },
    ],
  },
});
