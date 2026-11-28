"use client";

import { cn } from "@/lib/cn";
import { MAX_REMINDERS, type OffsetReminder } from "@/lib/domain/reminders";
import {
  byLeadTime,
  describeOffset,
  type OffsetPreset,
  sameOffset,
  shortOffset,
} from "@/lib/reminder-label";

const TOGGLE =
  "h-8 rounded-full px-3 text-xs font-semibold tabular-nums transition-[background-color,color,box-shadow,scale] duration-200 enabled:active:scale-90 disabled:opacity-50";
const ON = "bg-brand text-on-brand shadow-cta";
const OFF =
  "bg-surface text-fg-secondary ring-1 ring-line-strong enabled:hover:text-fg enabled:hover:ring-fg/30";

/**
 * "Remind me this long before" as a row of toggles, one per preset. An offset that isn't a
 * preset (saved by another client) gets a toggle of its own, so it can still be turned off.
 */
export function OffsetToggles({
  label,
  presets,
  rules,
  allDay,
  ruleCount,
  disabled = false,
  onToggle,
}: Readonly<{
  label: string;
  presets: readonly OffsetPreset[];
  /** The offset rules in force. */
  rules: readonly OffsetReminder[];
  allDay: boolean;
  /** All rules in the list, offsets or not: a full list takes no more. */
  ruleCount: number;
  disabled?: boolean;
  onToggle: (offset: OffsetPreset) => void;
}>) {
  const extras = rules.filter((rule) => !presets.some((preset) => sameOffset(preset, rule)));
  const full = ruleCount >= MAX_REMINDERS;

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {[...presets, ...extras].sort(byLeadTime).map((offset) => {
        const on = rules.some((rule) => sameOffset(rule, offset));
        const blocked = !on && full;
        return (
          <button
            key={`${offset.amount}-${offset.unit}`}
            type="button"
            aria-label={describeOffset(offset, allDay)}
            aria-pressed={on}
            aria-disabled={blocked || undefined}
            title={blocked ? `At most ${MAX_REMINDERS} reminders` : describeOffset(offset, allDay)}
            disabled={disabled}
            onClick={() => {
              if (!blocked) onToggle(offset);
            }}
            className={cn(TOGGLE, on ? ON : OFF)}
          >
            {shortOffset(offset, allDay)}
          </button>
        );
      })}
    </div>
  );
}
