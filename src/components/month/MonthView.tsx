"use client";

import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarDnd } from "@/components/calendar/CalendarDnd";
import { CalendarToolbar } from "@/components/calendar/CalendarToolbar";
import { EntryItem } from "@/components/calendar/EntryItem";
import { dayTarget, describeTarget, targetOfTask } from "@/components/calendar/targets";
import { useCalendarDrop } from "@/components/calendar/use-calendar-drop";
import { MonthIllustration } from "@/components/empty/illustrations";
import { LoadError } from "@/components/empty/LoadError";
import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/icons";
import { useWeekStartsOn } from "@/lib/client/settings";
import { useTasks } from "@/lib/client/tasks";
import { type DayKey, dayKey, entriesByDay, monthWeeks, parseDayKey } from "@/lib/domain/calendar";
import { useNow } from "@/lib/hooks/use-now";
import { WEEKDAY_NAME, weekdaysFrom } from "@/lib/recurrence-label";
import { useCalendar } from "@/lib/stores/calendar";
import { useUi } from "@/lib/stores/ui";
import { MonthDay } from "./MonthDay";

/** Arrow keys move a lifted task a day sideways, or a week up and down. */
const STEPS = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

export function MonthView() {
  const { data: tasks = [], isPending, isError, refetch } = useTasks();
  const weekStartsOn = useWeekStartsOn();
  const now = useNow();
  const router = useRouter();
  const focus = useCalendar((state) => state.focus);
  const setFocus = useCalendar((state) => state.setFocus);
  const openPalette = useUi((state) => state.openPalette);
  const onDrop = useCalendarDrop();
  /** The day whose tasks are listed under the grid on narrow screens. */
  const [picked, setPicked] = useState<DayKey | null>(null);

  const focusKey = focus ?? dayKey(now);
  const anchor = useMemo(() => parseDayKey(focusKey) ?? new Date(), [focusKey]);
  const weeks = useMemo(() => monthWeeks(anchor, weekStartsOn), [anchor, weekStartsOn]);
  const days = useMemo(() => weeks.flat(), [weeks]);
  const entries = useMemo(
    () => entriesByDay(tasks, days, now, weekStartsOn),
    [tasks, days, now, weekStartsOn],
  );
  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const targets = useMemo(() => days.map((day) => dayTarget(dayKey(day))), [days]);

  if (isError) return <LoadError onRetry={() => void refetch()} />;

  const pickedDay = picked ? parseDayKey(picked) : null;
  const selected =
    pickedDay && isSameMonth(pickedDay, anchor)
      ? pickedDay
      : isSameMonth(now, anchor)
        ? now
        : startOfMonth(anchor);
  const selectedEntries = entries.get(dayKey(selected)) ?? [];
  const inMonth = days.filter((day) => isSameMonth(day, anchor));
  const count = inMonth
    .flatMap((day) => entries.get(dayKey(day)) ?? [])
    .filter((entry) => entry.kind === "task").length;
  const empty = !isPending && [...entries.values()].every((list) => list.length === 0);
  const addOn = (day: Date) => openPalette("create", { dueOn: dayKey(day) });

  return (
    <CalendarDnd
      tasks={tasksById}
      targets={targets}
      steps={STEPS}
      targetOf={targetOfTask}
      describeTarget={describeTarget}
      variant="line"
      onDrop={onDrop}
    >
      <CalendarToolbar
        label={format(anchor, "MMMM yyyy")}
        unit="month"
        onStep={(direction) => setFocus(dayKey(addMonths(startOfMonth(anchor), direction)))}
        onToday={() => {
          setFocus(null);
          setPicked(null);
        }}
        note={isPending ? undefined : count === 1 ? "1 task" : `${count} tasks`}
      />

      <div className="relative mx-5 mb-6 md:mx-8">
        <div className="overflow-hidden rounded-2xl border-t border-l border-line bg-surface/30 shadow-card">
          <div aria-hidden className="grid grid-cols-7 border-b border-line bg-sunken/60">
            {weekdaysFrom(weekStartsOn).map((weekday) => (
              <span
                key={weekday}
                className="border-r border-line px-2 py-1.5 text-center text-[11px] font-semibold tracking-[0.12em] text-fg-muted uppercase lg:text-left"
              >
                <span className="lg:hidden">{WEEKDAY_NAME[weekday]?.slice(0, 1)}</span>
                <span className="hidden lg:inline">{WEEKDAY_NAME[weekday]?.slice(0, 3)}</span>
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) =>
              isPending ? (
                <div
                  key={day.toISOString()}
                  aria-hidden
                  className="min-h-14 border-r border-b border-line p-1.5 lg:min-h-32"
                >
                  <div className="h-4 w-1/2 skeleton rounded" />
                </div>
              ) : (
                <MonthDay
                  key={day.toISOString()}
                  day={day}
                  entries={entries.get(dayKey(day)) ?? []}
                  inMonth={isSameMonth(day, anchor)}
                  today={isSameDay(day, now)}
                  selected={isSameDay(day, selected)}
                  onAdd={() => addOn(day)}
                  onSelect={() => setPicked(dayKey(day))}
                  onShowAll={() => {
                    setFocus(dayKey(day));
                    router.push("/week");
                  }}
                />
              ),
            )}
          </div>
        </div>
        {empty && <BlankMonth />}
      </div>

      {!isPending && (
        <section
          aria-label={`${format(selected, "EEEE d MMMM")} agenda`}
          className="mx-5 mb-6 animate-fade-up md:mx-8 lg:hidden"
        >
          <header className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-2xl leading-none">{format(selected, "EEEE d MMMM")}</h2>
            <Button size="sm" onClick={() => addOn(selected)}>
              <PlusIcon className="size-4" />
              Add
            </Button>
          </header>
          {selectedEntries.length > 0 ? (
            <ul key={dayKey(selected)} className="flex flex-col gap-1.5">
              {selectedEntries.map((entry) => (
                <EntryItem key={entry.key} entry={entry} variant="card" />
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-fg/15 px-4 py-6 text-center text-sm text-fg-muted">
              Nothing planned. A rare and beautiful thing.
            </p>
          )}
        </section>
      )}
    </CalendarDnd>
  );
}

/** Over an empty grid: a hint that lets clicks through to the days beneath. */
function BlankMonth() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
      <div className="flex animate-fade-up flex-col items-center rounded-2xl bg-canvas/85 px-8 py-6 text-center shadow-card backdrop-blur-[2px]">
        <div className="mb-3 animate-float">
          <MonthIllustration />
        </div>
        <h2 className="text-3xl text-fg">A blank month</h2>
        <p className="mt-1 text-sm text-fg-secondary">
          Thirty-ish days of pure potential. <span className="hidden lg:inline">Click</span>
          <span className="lg:hidden">Tap</span> a day to plan something.
        </p>
      </div>
    </div>
  );
}
