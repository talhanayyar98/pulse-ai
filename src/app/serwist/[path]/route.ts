import { createSerwistRoute } from "@serwist/turbopack";
import { randomUUID } from "node:crypto";
import { APP_VIEWS, OFFLINE_FALLBACK_URL } from "@/lib/routes";

// The view pages are static shells (data arrives client-side), so precaching them
// makes every view open offline, even ones the user hasn't visited yet.
const revision = randomUUID();
const appShellUrls = [...APP_VIEWS.map((view) => view.href), OFFLINE_FALLBACK_URL];

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
    additionalPrecacheEntries: appShellUrls.map((url) => ({ url, revision })),
    // Serwist's defaults skip web fonts, which would make offline reloads fall back to system fonts.
    globPatterns: [".next/static/**/*.{js,css,ico,png,svg,webp,json,woff2}", "public/**/*"],
    // Install icons are only fetched by the browser at install time; keep them out of the precache.
    globIgnores: ["**/node_modules/**/*", "public/icons/**/*"],
  },
);
