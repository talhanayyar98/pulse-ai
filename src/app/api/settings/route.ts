import { requireUserId, route } from "@/lib/api/route";
import { type SettingsBody, settingsBodySchema } from "@/lib/domain/settings";
import { getSettings, saveSettings } from "@/lib/server/settings";

export const GET = route(async () => {
  const userId = await requireUserId();
  return Response.json({ settings: await getSettings(userId) } satisfies SettingsBody);
});

/** Replaces the user's settings with the full object sent. */
export const PUT = route(async (request) => {
  const userId = await requireUserId();
  const { settings } = settingsBodySchema.parse(await request.json());
  return Response.json({ settings: await saveSettings(userId, settings) } satisfies SettingsBody);
});
