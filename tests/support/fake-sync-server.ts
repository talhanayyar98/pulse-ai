import type { SyncResponse, TaskPutOp } from "@/lib/domain/sync";
import type { Task } from "@/lib/domain/task";

/** POST /api/sync's contract (last-write-wins on updatedAt) over a Map, recording each request. */
export function createFakeSyncServer() {
  const tasks = new Map<string, Task>();
  const requests: TaskPutOp[][] = [];

  async function sync(ops: TaskPutOp[]): Promise<SyncResponse> {
    requests.push(ops);
    return {
      results: ops.map(({ opId, task }) => {
        const stored = tasks.get(task.id);
        if (stored && Date.parse(task.updatedAt) <= Date.parse(stored.updatedAt)) {
          return { opId, status: "stale" as const, task: stored };
        }
        tasks.set(task.id, task);
        return { opId, status: "applied" as const, task };
      }),
    };
  }

  return { tasks, requests, sync };
}
