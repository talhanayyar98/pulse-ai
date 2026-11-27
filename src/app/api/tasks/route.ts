import { requireUserId, route } from "@/lib/api/route";
import type { TasksResponse } from "@/lib/domain/sync";
import { listTasks } from "@/lib/server/task-service";

export const GET = route(async () => {
  const userId = await requireUserId();
  return Response.json({ tasks: await listTasks(userId) } satisfies TasksResponse);
});
