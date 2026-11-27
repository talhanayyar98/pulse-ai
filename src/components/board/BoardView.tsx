"use client";

import { AnimatePresence, motion } from "motion/react";
import { TaskCard } from "@/components/task/TaskCard";
import { Button } from "@/components/ui/Button";
import { useTasks } from "@/lib/client/tasks";
import { tasksInColumn } from "@/lib/domain/task";
import { TASK_STATUSES, type TaskStatus } from "@/lib/domain/task-status";
import { springs } from "@/lib/motion";
import { BoardColumn } from "./BoardColumn";

const EMPTY_COLUMN_COPY: Record<TaskStatus, string> = {
  backlog: "Ideas wait here. No pressure.",
  todo: "Nothing queued. Suspiciously calm.",
  in_progress: "Idle hands. Pick something up.",
  done: "Victories land here.",
};

export function BoardView() {
  const { data: tasks, isPending, isError, refetch } = useTasks();

  if (isError) {
    return (
      <div className="mx-5 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface/70 p-4 md:mx-8">
        <p className="text-sm text-fg-secondary">Couldn&apos;t load your tasks.</p>
        <Button size="sm" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-6 md:scroll-px-8 md:px-8 lg:grid lg:grid-cols-4 lg:overflow-visible">
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks ? tasksInColumn(tasks, status) : [];
        return (
          <BoardColumn key={status} status={status} count={columnTasks.length}>
            {isPending ? (
              <CardSkeletons />
            ) : (
              <ul className="flex flex-col gap-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {columnTasks.map((task) => (
                    <motion.li
                      key={task.id}
                      layoutId={task.id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={springs.snappy}
                    >
                      <TaskCard task={task} />
                    </motion.li>
                  ))}
                </AnimatePresence>
                {columnTasks.length === 0 && (
                  <li className="grid h-36 place-items-center rounded-xl border border-dashed border-line px-4 text-center text-sm text-fg-muted">
                    {EMPTY_COLUMN_COPY[status]}
                  </li>
                )}
              </ul>
            )}
          </BoardColumn>
        );
      })}
    </div>
  );
}

function CardSkeletons() {
  return (
    <div aria-hidden className="flex flex-col gap-2">
      {[0, 1].map((index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl bg-white/4" />
      ))}
    </div>
  );
}
