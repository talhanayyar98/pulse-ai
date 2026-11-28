"use client";

import { type ReactNode, useId } from "react";
import { OffsetToggles } from "@/components/reminders/OffsetToggles";
import { Button } from "@/components/ui/Button";
import { XIcon } from "@/components/ui/icons";
import { Overlay } from "@/components/ui/Overlay";
import { Segmented } from "@/components/ui/Segmented";
import { type PushState, usePush } from "@/lib/client/push";
import { deviceTimeZone } from "@/lib/client/reminders";
import { useSaveSettings, useSettings } from "@/lib/client/settings";
import { toggleOffset } from "@/lib/domain/reminders";
import { type Settings, WEEK_START_DAYS, WEEK_START_LABEL } from "@/lib/domain/settings";
import { useDraft } from "@/lib/hooks/use-draft";
import { useOnline } from "@/lib/hooks/use-online";
import { TIMED_PRESETS } from "@/lib/reminder-label";
import { useUi } from "@/lib/stores/ui";

const WEEK_START_OPTIONS = WEEK_START_DAYS.map((day) => ({
  value: String(day),
  label: WEEK_START_LABEL[day],
}));

export function SettingsDialog() {
  const open = useUi((state) => state.settingsOpen);
  const session = useUi((state) => state.settingsSession);
  const close = useUi((state) => state.closeSettings);

  return (
    <Overlay open={open} onClose={close} label="Settings" variant="dialog" contentKey={session}>
      {open && <SettingsBody onClose={close} />}
    </Overlay>
  );
}

function SettingsBody({ onClose }: Readonly<{ onClose: () => void }>) {
  const settings = useSettings();
  const save = useSaveSettings();
  const online = useOnline();

  return (
    <div className="max-h-[76dvh] overflow-y-auto p-6">
      <header className="flex items-center justify-between gap-4">
        <h2 className="text-3xl leading-none">Settings</h2>
        <Button variant="ghost" size="icon" aria-label="Close" className="group" onClick={onClose}>
          <XIcon className="size-5 transition-transform duration-300 ease-spring group-hover:rotate-90" />
        </Button>
      </header>

      {!online && (
        <p className="mt-4 rounded-xl border border-progress/25 bg-progress-soft px-3.5 py-2.5 text-xs text-fg-secondary">
          You&apos;re offline. Settings save to your account, so they can be changed once
          you&apos;re back online.
        </p>
      )}

      <Section title="Calendar">
        <Row
          title="Week starts on"
          hint="Used by the week planner, the month calendar and the “This week” filter."
        >
          <Segmented
            label="Week starts on"
            value={String(settings.weekStartsOn)}
            options={WEEK_START_OPTIONS}
            disabled={!online}
            onChange={(value) => {
              const weekStartsOn = WEEK_START_DAYS.find((day) => String(day) === value);
              if (weekStartsOn !== undefined) save({ ...settings, weekStartsOn });
            }}
          />
        </Row>
      </Section>

      <ReminderSettings settings={settings} save={save} disabled={!online} />
      <DeviceNotifications />
    </div>
  );
}

function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="mt-6 border-t border-line pt-5">
      <h3 id={id} className="text-lg leading-none">
        {title}
      </h3>
      <div className="mt-4 flex flex-col gap-5">{children}</div>
    </section>
  );
}

/** A setting: what it is on the left, its control on the right (below, when `stacked`). */
function Row({
  title,
  hint,
  stacked = false,
  children,
}: Readonly<{ title: string; hint: ReactNode; stacked?: boolean; children: ReactNode }>) {
  return (
    <div
      className={
        stacked
          ? "flex flex-col gap-3"
          : "flex flex-wrap items-center justify-between gap-x-6 gap-y-3"
      }
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-fg-secondary">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function ReminderSettings({
  settings,
  save,
  disabled,
}: Readonly<{ settings: Settings; save: (settings: Settings) => void; disabled: boolean }>) {
  const device = deviceTimeZone();
  const zone = settings.timeZone ?? device;
  const time = useDraft(settings.allDayReminderTime, (allDayReminderTime) => {
    if (/^\d{2}:\d{2}$/.test(allDayReminderTime)) save({ ...settings, allDayReminderTime });
  });

  return (
    <Section title="Reminders">
      <Row
        stacked
        title="Default reminders"
        hint="For every task with a due date that has no reminders of its own."
      >
        <OffsetToggles
          label="Default reminders"
          presets={TIMED_PRESETS}
          rules={settings.defaultReminders}
          allDay={false}
          ruleCount={settings.defaultReminders.length}
          disabled={disabled}
          onToggle={(offset) =>
            save({
              ...settings,
              defaultReminders: toggleOffset(
                settings.defaultReminders,
                offset,
                crypto.randomUUID(),
              ),
            })
          }
        />
      </Row>
      <Row
        title="All-day tasks"
        hint="Their reminders count from this time on the day: “1 day before” is the day before at this time."
      >
        <input
          type="time"
          aria-label="All-day reminder time"
          value={time.draft}
          disabled={disabled}
          onChange={(event) => time.setDraft(event.target.value)}
          onBlur={time.flush}
          className="field tabular-nums"
        />
      </Row>
      <Row
        title="Time zone"
        hint={
          zone === device ? (
            "Reminder times are worked out in this zone, the one this device uses."
          ) : (
            <>
              Reminder times are worked out in this zone. This device is in{" "}
              <span className="font-medium text-fg">{device}</span>.
            </>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium tabular-nums">{zone}</span>
          {zone !== device && (
            <Button
              size="sm"
              disabled={disabled}
              onClick={() => save({ ...settings, timeZone: device })}
            >
              Use {device}
            </Button>
          )}
        </div>
      </Row>
    </Section>
  );
}

const DEVICE_STATUS: Record<PushState, string> = {
  checking: "Checking…",
  on: "On: reminders arrive even when Pulse is closed.",
  off: "Off: reminders show only while Pulse is open.",
  prompt: "Off: reminders show only while Pulse is open.",
  denied:
    "Blocked in this browser's site settings. Allow notifications for Pulse there, then reload.",
  unsupported:
    "This browser can't receive notifications from Pulse. In Safari on iPhone and iPad, add Pulse to the Home Screen first.",
  unconfigured: "This server isn't set up to send notifications (it has no VAPID keys).",
};

function DeviceNotifications() {
  const state = usePush((store) => store.state);
  const busy = usePush((store) => store.busy);
  const { enable, disable } = usePush.getState();
  const online = useOnline();

  return (
    <Section title="Notifications">
      <Row title="On this device" hint={DEVICE_STATUS[state]}>
        {(state === "prompt" || state === "off") && (
          <Button variant="primary" size="sm" disabled={busy || !online} onClick={enable}>
            Turn on
          </Button>
        )}
        {state === "on" && (
          <Button size="sm" disabled={busy || !online} onClick={disable}>
            Turn off
          </Button>
        )}
      </Row>
    </Section>
  );
}
