import { z } from "zod";
import { notificationsResponseSchema, type SentNotification } from "@/lib/domain/notifications";
import { pushConfigSchema, type PushSubscriptionJson } from "@/lib/domain/push";
import { type Settings, settingsBodySchema } from "@/lib/domain/settings";
import {
  type SyncResponse,
  syncResponseSchema,
  type TaskPutOp,
  tasksResponseSchema,
} from "@/lib/domain/sync";
import type { Task } from "@/lib/domain/task";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const errorBodySchema = z.object({ error: z.string() });

async function send(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!response.ok) {
    const body = errorBodySchema.safeParse(await response.json().catch(() => null));
    throw new ApiError(response.status, body.success ? body.data.error : response.statusText);
  }
  return response;
}

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await send(path, init);
  // Responses cross a trust boundary (and may come from an older deploy): validate them.
  return schema.parse(await response.json());
}

export const sessionSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string().nullish(),
    email: z.string().nullish(),
    image: z.string().nullish(),
  }),
  expires: z.string(),
});
export type ClientSession = z.infer<typeof sessionSchema>;

export const api = {
  /** Auth.js answers `null` (or `{}` on older versions) when signed out. */
  async session(): Promise<ClientSession | null> {
    const parsed = sessionSchema.safeParse(await request("/api/auth/session", z.unknown()));
    return parsed.success ? parsed.data : null;
  },

  async listTasks(): Promise<Task[]> {
    return (await request("/api/tasks", tasksResponseSchema)).tasks;
  },

  sync(ops: TaskPutOp[]): Promise<SyncResponse> {
    return request("/api/sync", syncResponseSchema, {
      method: "POST",
      body: JSON.stringify({ ops }),
    });
  },

  async getSettings(): Promise<Settings> {
    return (await request("/api/settings", settingsBodySchema)).settings;
  },

  async putSettings(settings: Settings): Promise<Settings> {
    const body = await request("/api/settings", settingsBodySchema, {
      method: "PUT",
      body: JSON.stringify({ settings }),
    });
    return body.settings;
  },

  async listNotifications(): Promise<SentNotification[]> {
    return (await request("/api/notifications", notificationsResponseSchema)).notifications;
  },

  /** The VAPID public key to subscribe with; null when the server sends no pushes. */
  async pushPublicKey(): Promise<string | null> {
    return (await request("/api/push", pushConfigSchema)).publicKey;
  },

  async savePushSubscription(subscription: PushSubscriptionJson): Promise<void> {
    await send("/api/push/subscriptions", {
      method: "POST",
      body: JSON.stringify({ subscription }),
    });
  },

  async deletePushSubscription(endpoint: string): Promise<void> {
    await send("/api/push/subscriptions", { method: "DELETE", body: JSON.stringify({ endpoint }) });
  },
};
