import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { TASK_STATUS_LABEL, type TaskStatus } from "@/lib/domain/task-status";

const STATUS_DOT: Record<TaskStatus, string> = {
  backlog: "bg-fg-muted",
  todo: "bg-brand-text",
  in_progress: "bg-brand shadow-[0_0_10px_var(--color-brand-glow)]",
  done: "bg-neon shadow-[0_0_10px_var(--color-neon-glow)]",
};

export function BoardColumn({
  status,
  count,
  children,
}: Readonly<{ status: TaskStatus; count: number; children: ReactNode }>) {
  const label = TASK_STATUS_LABEL[status];
  return (
    <section
      aria-label={label}
      className="flex w-[min(20rem,82vw)] shrink-0 snap-start flex-col rounded-2xl border border-line bg-surface/70 lg:w-auto lg:shrink"
    >
      <header className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <span className={cn("size-2 rounded-full", STATUS_DOT[status])} aria-hidden />
        <h2 className="font-display text-sm font-semibold">{label}</h2>
        <span className="ml-auto font-mono text-xs text-fg-muted">{count}</span>
      </header>
      <div className="flex min-h-48 flex-1 flex-col gap-2 px-3 pb-3">{children}</div>
    </section>
  );
}
