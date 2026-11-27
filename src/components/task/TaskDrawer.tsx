"use client";

import { format, formatDistanceToNow } from "date-fns";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChevronDownIcon, TrashIcon, XIcon } from "@/components/ui/icons";
import { Overlay } from "@/components/ui/Overlay";
import { Segmented } from "@/components/ui/Segmented";
import { useTaskActions, useTasks } from "@/lib/client/tasks";
import {
  HORIZON_LABEL,
  HORIZONS,
  PRIORITIES,
  PRIORITY_LABEL,
  type Task,
  type TaskPatch,
} from "@/lib/domain/task";
import { TASK_STATUS_LABEL, TASK_STATUSES } from "@/lib/domain/task-status";
import { useNow } from "@/lib/hooks/use-now";
import { useUi } from "@/lib/stores/ui";
import { DescriptionField } from "./fields/DescriptionField";
import { DueField } from "./fields/DueField";
import { LabelsField } from "./fields/LabelsField";
import { SubtaskList } from "./fields/SubtaskList";
import { TitleField } from "./fields/TitleField";
import { PriorityIcon } from "./PriorityIcon";

const PRIORITY_OPTIONS = PRIORITIES.map((priority) => ({
  value: priority,
  label: PRIORITY_LABEL[priority],
  icon: <PriorityIcon priority={priority} className="size-3.5" />,
}));
const HORIZON_OPTIONS = HORIZONS.map((horizon) => ({
  value: horizon,
  label: HORIZON_LABEL[horizon],
}));

export function TaskDrawer() {
  const taskId = useUi((state) => state.drawerTaskId);
  const session = useUi((state) => state.drawerSession);
  const closeDrawer = useUi((state) => state.closeDrawer);
  const { data: tasks } = useTasks();
  const task = tasks?.find((candidate) => candidate.id === taskId);

  return (
    <Overlay
      open={Boolean(task)}
      onClose={closeDrawer}
      label="Task details"
      variant="drawer"
      initialFocus="panel"
      contentKey={session}
    >
      {task && (
        <TaskDetails key={task.id} task={task} allTasks={tasks ?? []} onClose={closeDrawer} />
      )}
    </Overlay>
  );
}

function TaskDetails({
  task,
  allTasks,
  onClose,
}: Readonly<{ task: Task; allTasks: Task[]; onClose: () => void }>) {
  const actions = useTaskActions();
  const update = (patch: TaskPatch) => actions.update(task.id, patch);
  const labelSuggestions = useMemo(
    () => [...new Set(allTasks.flatMap((candidate) => candidate.labels))].sort(),
    [allTasks],
  );

  return (
    <>
      <header className="flex items-center gap-2 border-b border-line px-5 py-3">
        <label className="relative">
          <span className="sr-only">Status</span>
          <select
            value={task.status}
            onChange={(event) => {
              const status = TASK_STATUSES.find((candidate) => candidate === event.target.value);
              if (status) update({ status });
            }}
            className="appearance-none field py-1.5 pr-8 font-medium"
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TASK_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-fg-muted" />
        </label>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close"
          className="ml-auto"
          onClick={onClose}
        >
          <XIcon className="size-5" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <TitleField value={task.title} onCommit={(title) => update({ title })} />

        <dl className="mt-6 grid grid-cols-1 gap-y-1.5 text-sm sm:grid-cols-[6rem_1fr] sm:items-center sm:gap-x-3 sm:gap-y-4">
          <dt className="text-fg-secondary">Priority</dt>
          <dd>
            <Segmented
              label="Priority"
              value={task.priority}
              options={PRIORITY_OPTIONS}
              onChange={(priority) => update({ priority })}
            />
          </dd>

          <dt className="mt-3 text-fg-secondary sm:mt-0">Horizon</dt>
          <dd>
            <Segmented
              label="Planning horizon"
              value={task.horizon}
              options={HORIZON_OPTIONS}
              onChange={(horizon) => update({ horizon })}
            />
          </dd>

          <dt className="mt-3 text-fg-secondary sm:mt-0">Due</dt>
          <dd>
            <DueField due={task} onCommit={(due) => update(due)} />
          </dd>

          <dt className="mt-3 text-fg-secondary sm:mt-0 sm:self-start sm:pt-1">Labels</dt>
          <dd>
            <LabelsField
              labels={task.labels}
              suggestions={labelSuggestions}
              onChange={(labels) => update({ labels })}
            />
          </dd>
        </dl>

        <section className="mt-8" aria-labelledby="subtasks-heading">
          <h3 id="subtasks-heading" className="mb-2 text-sm font-semibold">
            Subtasks
          </h3>
          <SubtaskList subtasks={task.subtasks} onChange={(subtasks) => update({ subtasks })} />
        </section>

        <section className="mt-8">
          <DescriptionField
            value={task.description}
            onCommit={(description) => update({ description })}
          />
        </section>
      </div>

      <TaskFooter
        task={task}
        onDelete={() => {
          onClose();
          actions.remove(task.id);
        }}
      />
    </>
  );
}

function TaskFooter({ task, onDelete }: Readonly<{ task: Task; onDelete: () => void }>) {
  const [confirming, setConfirming] = useState(false);
  const now = useNow();
  const updated =
    Math.abs(now.getTime() - Date.parse(task.updatedAt)) < 60_000
      ? "just now"
      : formatDistanceToNow(task.updatedAt, { addSuffix: true });

  return (
    <footer className="flex items-center gap-3 border-t border-line px-5 py-3">
      <p className="flex-1 font-mono text-[11px] text-fg-muted">
        Created {format(task.createdAt, "d MMM yyyy")} · Updated {updated}
      </p>
      <Button
        size="sm"
        variant={confirming ? "secondary" : "ghost"}
        onClick={() => (confirming ? onDelete() : setConfirming(true))}
        onBlur={() => setConfirming(false)}
      >
        <TrashIcon className="size-4" />
        {confirming ? "Click again to delete" : "Delete"}
      </Button>
    </footer>
  );
}
