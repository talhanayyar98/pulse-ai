import { route } from "@/lib/api/route";
import type { PushConfig } from "@/lib/domain/push";
import { env } from "@/lib/env";

/** The VAPID public key browsers subscribe with; null when this server sends no pushes. */
export const GET = route(async () =>
  Response.json({ publicKey: env.vapid?.publicKey ?? null } satisfies PushConfig),
);
