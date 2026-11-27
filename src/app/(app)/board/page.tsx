import type { Metadata } from "next";
import { BoardColumn } from "@/components/board/BoardColumn";
import { ViewHeader } from "@/components/shell/ViewHeader";
import { TASK_STATUSES, type TaskStatus } from "@/lib/domain/task-status";

export const metadata: Metadata = { title: "Board" };

const EMPTY_COLUMN_COPY: Record<TaskStatus, string> = {
  backlog: "Ideas wait here. No pressure.",
  todo: "Nothing queued. Suspiciously calm.",
  in_progress: "Idle hands. Pick something up.",
  done: "Victories land here.",
};

export default function BoardPage() {
  return (
    <>
      <ViewHeader title="Board" tagline="Everything in flight, one drag away." />
      <div className="flex flex-1 snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-6 md:scroll-px-8 md:px-8 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {TASK_STATUSES.map((status) => (
          <BoardColumn key={status} status={status} count={0}>
            <p className="grid h-36 place-items-center rounded-xl border border-dashed border-line px-4 text-center text-sm text-fg-muted">
              {EMPTY_COLUMN_COPY[status]}
            </p>
          </BoardColumn>
        ))}
      </div>
    </>
  );
}
