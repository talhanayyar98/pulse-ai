import type { TaskStatus } from "@/lib/domain/task-status";

/** One colour per column, shared by the board and the task drawer. */
export const STATUS_TONE: Record<TaskStatus, { dot: string; edge: string }> = {
  backlog: { dot: "bg-fg-muted", edge: "via-white/25" },
  todo: { dot: "bg-info shadow-[0_0_10px_var(--color-info-glow)]", edge: "via-info/70" },
  in_progress: {
    dot: "bg-brand shadow-[0_0_10px_var(--color-brand-glow)]",
    edge: "via-brand",
  },
  done: { dot: "bg-success shadow-[0_0_10px_var(--color-success-glow)]", edge: "via-success/70" },
};
