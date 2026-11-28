import { z } from "zod";
import { taskSchema } from "./task";

/**
 * Every write is a full task snapshot ("put"); a delete is a put with deletedAt set.
 * The server keeps whichever snapshot has the newer updatedAt, which makes replaying
 * the same op twice harmless: the offline outbox resends whatever it isn't sure arrived.
 */
export const taskPutOpSchema = z.object({
  opId: z.uuid(),
  type: z.literal("task.put"),
  task: taskSchema,
});
export type TaskPutOp = z.infer<typeof taskPutOpSchema>;

export const syncRequestSchema = z.object({
  ops: z.array(taskPutOpSchema).min(1).max(100),
});

export const syncResponseSchema = z.object({
  results: z.array(
    z.object({
      opId: z.uuid(),
      /** "stale": the server already had a newer version, returned in `task`. */
      status: z.enum(["applied", "stale"]),
      task: taskSchema,
    }),
  ),
});
export type SyncResponse = z.infer<typeof syncResponseSchema>;

export const tasksResponseSchema = z.object({ tasks: z.array(taskSchema) });
export type TasksResponse = z.infer<typeof tasksResponseSchema>;
