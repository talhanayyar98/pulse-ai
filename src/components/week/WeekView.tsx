"use client";

import { addWeeks, isBefore, isSameDay, startOfDay } from "date-fns";
import { useMemo } from "react";
import { CalendarDnd } from "@/components/calendar/CalendarDnd";
import { CalendarToolbar } from "@/components/calendar/CalendarToolbar";
import {
  dayTarget,
  describeTarget,
  targetOfTask,
  UNSCHEDULED_TARGET,
} from "@/components/calendar/targets";
import { useCalendarDrop } from "@/components/calendar/use-calendar-drop";
import { EmptyState } from "@/components/empty/EmptyState";
import { WeekIllustration } from "@/components/empty/illustrations";
import { LoadError } from "@/components/empty/LoadError";
import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/icons";
import { useWeekStartsOn } from "@/lib/client/settings";
import { useTasks } from "@/lib/client/tasks";
import {
  dayKey,
  entriesByDay,
  formatDayRange,
  parseDayKey,
  unscheduledTasks,
  weekDays,
} from "@/lib/domain/calendar";
import { useNow } from "@/lib/hooks/use-now";
import { useCalendar } from "@/lib/stores/calendar";
import { useUi } from "@/lib/stores/ui";
import { UnscheduledTray } from "./UnscheduledTray";
import { WeekDay } from "./WeekDay";

/** Arrow keys walk the tray and the seven days in order. */
const STEPS = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };

export function WeekView() {
  const { data: tasks = [], isPending, isError, refetch } = useTasks();
  const weekStartsOn = useWeekStartsOn();
  const now = useNow();
  const focus = useCalendar((state) => state.focus);
  const setFocus = useCalendar((state) => state.setFocus);
  const openPalette = useUi((state) => state.openPalette);
  const onDrop = useCalendarDrop();

  const focusKey = focus ?? dayKey(now);
  const days = useMemo(
    () => weekDays(parseDayKey(focusKey) ?? new Date(), weekStartsOn),
    [focusKey, weekStartsOn],
  );
  const entries = useMemo(
    () => entriesByDay(tasks, days, now, weekStartsOn),
    [tasks, days, now, weekStartsOn],
  );
  const unscheduled = useMemo(() => unscheduledTasks(tasks), [tasks]);
  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const targets = useMemo(
    () => [UNSCHEDULED_TARGET, ...days.map((day) => dayTarget(dayKey(day)))],
    [days],
  );

  if (isError) return <LoadError onRetry={() => void refetch()} />;

  const first = days[0] ?? now;
  const last = days.at(-1) ?? now;
  const shown = [...entries.values()].flat();
  // Real tasks only: projected repeats are previews, not work you've planned.
  const count = shown.filter((entry) => entry.kind === "task").length;
  const today = startOfDay(now);
  const step = (direction: -1 | 1) => setFocus(dayKey(addWeeks(first, direction)));

  return (
    <CalendarDnd
      tasks={tasksById}
      targets={targets}
      steps={STEPS}
      targetOf={targetOfTask}
      describeTarget={describeTarget}
      variant="card"
      onDrop={onDrop}
    >
      <CalendarToolbar
        label={formatDayRange(first, last)}
        unit="week"
        onStep={step}
        onToday={() => setFocus(null)}
        note={isPending ? undefined : count === 1 ? "1 task" : `${count} tasks`}
      />
      {!isPending && shown.length === 0 && unscheduled.length === 0 ? (
        <EmptyState
          illustration={<WeekIllustration />}
          title="A wide-open week"
          body="Nothing planned yet. Enjoy it while it lasts."
          action={
            <Button
              variant="primary"
              onClick={() =>
                openPalette("create", { dueOn: dayKey(isBefore(first, today) ? today : first) })
              }
            >
              <PlusIcon className="size-4" />
              Plan something
            </Button>
          }
        />
      ) : (
        !isPending && <UnscheduledTray tasks={unscheduled} />
      )}
      <div className="flex flex-col gap-2.5 px-5 pb-6 md:px-8 xl:grid xl:grid-cols-7 xl:gap-2.5">
        {days.map((day, index) =>
          isPending ? (
            <div
              key={day.toISOString()}
              aria-hidden
              className="h-20 skeleton rounded-2xl xl:h-80"
              style={{ animationDelay: `${index * 80}ms` }}
            />
          ) : (
            <WeekDay
              key={day.toISOString()}
              day={day}
              entries={entries.get(dayKey(day)) ?? []}
              today={isSameDay(day, now)}
              past={isBefore(day, today)}
              onAdd={() => openPalette("create", { dueOn: dayKey(day) })}
            />
          ),
        )}
      </div>
    </CalendarDnd>
  );
}
