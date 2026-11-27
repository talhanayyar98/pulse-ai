import type { MetadataRoute } from "next";
import { NEW_TASK_URL } from "@/lib/routes";
import { palette } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Pulse",
    short_name: "Pulse",
    description: "A keyboard-first task manager: Kanban board, week planner and month calendar.",
    start_url: "/board",
    scope: "/",
    display: "standalone",
    background_color: palette.base,
    theme_color: palette.base,
    categories: ["productivity"],
    // Re-use an open Pulse window for shortcuts and (later) notification clicks.
    launch_handler: { client_mode: ["navigate-existing", "auto"] },
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "New task",
        url: NEW_TASK_URL,
        icons: [{ src: "/icons/shortcut-new-task.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "This week",
        url: "/week",
        icons: [{ src: "/icons/shortcut-this-week.png", sizes: "96x96", type: "image/png" }],
      },
    ],
  };
}
