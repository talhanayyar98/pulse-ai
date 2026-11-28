import type { TaskStatus } from "@/lib/domain/task-status";

/**
 * One hue per column, shared by the board and the task drawer:
 * slate (Backlog), blue (To Do), ochre (In progress), green (Done).
 */
export const STATUS_TONE: Record<
  TaskStatus,
  {
    /** Status dot. */
    dot: string;
    /** The column's own tint (also the drawer header). */
    soft: string;
    /** Column border, with a coloured cap along the top. */
    border: string;
    /** Ring while a dragged card is over the column. */
    ring: string;
    /** Filled count badge. */
    count: string;
  }
> = {
  backlog: {
    dot: "bg-slate",
    soft: "bg-slate-soft",
    border: "border-slate/20 border-t-slate",
    ring: "ring-slate/40",
    count: "bg-slate text-on-brand",
  },
  todo: {
    dot: "bg-info",
    soft: "bg-info-soft",
    border: "border-info/20 border-t-info",
    ring: "ring-info/40",
    count: "bg-info text-on-brand",
  },
  in_progress: {
    dot: "bg-progress",
    soft: "bg-progress-soft",
    border: "border-progress/20 border-t-progress",
    ring: "ring-progress/40",
    count: "bg-progress text-on-brand",
  },
  done: {
    dot: "bg-success",
    soft: "bg-success-soft",
    border: "border-success/20 border-t-success",
    ring: "ring-success/40",
    count: "bg-success text-on-brand",
  },
};
