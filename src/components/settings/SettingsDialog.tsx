"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { XIcon } from "@/components/ui/icons";
import { Overlay } from "@/components/ui/Overlay";
import { Segmented } from "@/components/ui/Segmented";
import { useSaveSettings, useSettings } from "@/lib/client/settings";
import { WEEK_START_DAYS, WEEK_START_LABEL } from "@/lib/domain/settings";
import { useOnline } from "@/lib/hooks/use-online";
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
  const calendarId = useId();

  return (
    <div className="p-6">
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

      <section aria-labelledby={calendarId} className="mt-6 border-t border-line pt-5">
        <h3 id={calendarId} className="text-lg leading-none">
          Calendar
        </h3>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Week starts on</p>
            <p className="mt-0.5 text-xs text-fg-secondary">
              Used by the week planner, the month calendar and the “This week” filter.
            </p>
          </div>
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
        </div>
      </section>
    </div>
  );
}
