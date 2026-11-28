import { format } from "date-fns";
import { z } from "zod";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const OCCURRENCE_ID = new RegExp(`^${UUID}:\\d{4}-\\d{2}-\\d{2}$`, "i");

/**
 * Task ids are created on the client: a random UUID, or for a later occurrence of a
 * recurring task `<series id>:<yyyy-MM-dd>`. The predictable form means two devices that
 * complete the same occurrence create the same next task rather than two of them.
 */
export const taskIdSchema = z.union([z.uuid(), z.string().regex(OCCURRENCE_ID)]);

/** The first task of a series is the series: its id is the series id. */
export function seriesIdOf(taskId: string): string {
  return taskId.split(":")[0] ?? taskId;
}

/** Id of the occurrence of `taskId`'s series on `at`'s (local) day. */
export function occurrenceId(taskId: string, at: Date): string {
  return `${seriesIdOf(taskId)}:${format(at, "yyyy-MM-dd")}`;
}
