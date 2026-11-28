import { requireUserId, route } from "@/lib/api/route";
import { type SyncResponse, syncRequestSchema } from "@/lib/domain/sync";
import { putTask } from "@/lib/server/task-service";

/** Applies a batch of task snapshots in order: every write, sent live or replayed from the offline outbox. */
export const POST = route(async (request) => {
  const userId = await requireUserId();
  const { ops } = syncRequestSchema.parse(await request.json());

  const results: SyncResponse["results"] = [];
  for (const op of ops) {
    const result = await putTask(userId, op.task);
    results.push({ opId: op.opId, ...result });
  }
  return Response.json({ results } satisfies SyncResponse);
});
