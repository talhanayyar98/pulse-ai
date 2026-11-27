import { z } from "zod";
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

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
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
  // Responses cross a trust boundary (and may come from an older deploy): validate them.
  return schema.parse(await response.json());
}

const sessionSchema = z.object({
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
};
