"use client";

import { useRouter } from "next/navigation";
import { type KeyboardEvent, type ReactNode, useId, useState } from "react";
import { NAV_ITEMS } from "@/components/shell/nav";
import { PriorityIcon } from "@/components/task/PriorityIcon";
import { PlusIcon, SearchIcon } from "@/components/ui/icons";
import { Kbd } from "@/components/ui/Kbd";
import { Overlay } from "@/components/ui/Overlay";
import { cn } from "@/lib/cn";
import { useTaskActions, useTasks } from "@/lib/client/tasks";
import { parseQuickAdd } from "@/lib/domain/quick-add";
import { TASK_STATUS_LABEL } from "@/lib/domain/task-status";
import { type PaletteMode, useUi } from "@/lib/stores/ui";
import { useToasts } from "@/lib/stores/toasts";

export function CommandPalette() {
  const mode = useUi((state) => state.palette);
  const session = useUi((state) => state.paletteSession);
  const closePalette = useUi((state) => state.closePalette);

  return (
    <Overlay
      open={mode !== null}
      onClose={closePalette}
      label="Command palette"
      variant="dialog"
      contentKey={session}
    >
      {mode && <PaletteBody mode={mode} onClose={closePalette} />}
    </Overlay>
  );
}

interface PaletteItem {
  id: string;
  group: "Create" | "Tasks" | "Go to";
  icon: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
  run: () => void;
}

const MAX_TASK_RESULTS = 6;

function PaletteBody({ mode, onClose }: Readonly<{ mode: PaletteMode; onClose: () => void }>) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const router = useRouter();
  const { data: tasks = [] } = useTasks();
  const actions = useTaskActions();
  const openDrawer = useUi((state) => state.openDrawer);
  const pushToast = useToasts((state) => state.push);

  const parsed = parseQuickAdd(query);
  const needle = query.trim().toLowerCase();
  const items: PaletteItem[] = [];

  if (parsed.title) {
    items.push({
      id: "create",
      group: "Create",
      icon: <PlusIcon className="size-4 text-neon" />,
      label: (
        <>
          Create <span className="font-semibold text-fg">“{parsed.title}”</span>
        </>
      ),
      meta: (
        <span className="flex items-center gap-1.5">
          {parsed.labels.map((label) => (
            <span key={label} className="rounded bg-brand/15 px-1.5 text-brand-text">
              {label}
            </span>
          ))}
          {parsed.priority && <PriorityIcon priority={parsed.priority} />}
          <span className="text-fg-muted">→ {TASK_STATUS_LABEL.todo}</span>
        </span>
      ),
      run: () => {
        actions.create({
          title: parsed.title,
          labels: parsed.labels,
          ...(parsed.priority ? { priority: parsed.priority } : {}),
        });
        pushToast({ title: `Added to ${TASK_STATUS_LABEL.todo}`, tone: "success" });
        onClose();
      },
    });
  }

  if (mode === "search") {
    const matches = needle
      ? tasks.filter(
          (task) =>
            task.title.toLowerCase().includes(needle) ||
            task.labels.some((label) => label.toLowerCase().includes(needle)),
        )
      : [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    for (const task of matches.slice(0, MAX_TASK_RESULTS)) {
      items.push({
        id: `task-${task.id}`,
        group: "Tasks",
        icon: <PriorityIcon priority={task.priority} />,
        label: task.title,
        meta: <span className="text-fg-muted">{TASK_STATUS_LABEL[task.status]}</span>,
        run: () => {
          onClose();
          openDrawer(task.id);
        },
      });
    }
    for (const view of NAV_ITEMS) {
      if (needle && !view.label.toLowerCase().includes(needle)) continue;
      items.push({
        id: `nav-${view.href}`,
        group: "Go to",
        icon: <view.Icon className="size-4 text-brand-text" />,
        label: view.label,
        run: () => {
          onClose();
          router.push(view.href);
        },
      });
    }
  }

  const active = Math.min(activeIndex, Math.max(items.length - 1, 0));

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((active + step + items.length) % items.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      items[active]?.run();
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl">
      <div className="flex items-center gap-3 border-b border-line px-4">
        {mode === "create" ? (
          <PlusIcon className="size-5 text-neon" />
        ) : (
          <SearchIcon className="size-5 text-fg-muted" />
        )}
        <input
          data-autofocus
          role="combobox"
          aria-expanded={items.length > 0}
          aria-controls={listId}
          aria-activedescendant={items[active] ? `${listId}-${items[active].id}` : undefined}
          aria-label={mode === "create" ? "New task" : "Search tasks and commands"}
          placeholder={mode === "create" ? "What needs doing?" : "Search tasks, or type to create…"}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-fg-muted"
        />
        <Kbd className="text-fg-muted">esc</Kbd>
      </div>

      {items.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Results"
          className="max-h-80 overflow-y-auto p-2"
        >
          {items.map((item, index) => (
            <li key={item.id} role="presentation">
              {item.group !== items[index - 1]?.group && (
                <p className="px-3 pt-2 pb-1 font-mono text-[11px] tracking-[0.14em] text-fg-muted uppercase">
                  {item.group}
                </p>
              )}
              <div
                id={`${listId}-${item.id}`}
                role="option"
                aria-selected={index === active}
                onMouseMove={() => setActiveIndex(index)}
                onClick={item.run}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-fg-secondary",
                  index === active && "bg-brand/15 text-fg shadow-glow-brand",
                )}
              >
                {item.icon}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.meta && <span className="shrink-0 text-xs">{item.meta}</span>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-fg-muted">
          {mode === "create"
            ? "Type a title to create a task."
            : "No matches. Keep typing to create a task."}
        </p>
      )}

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-[11px] text-fg-muted">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navigate
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd> select
        </span>
        <span className="ml-auto font-mono">
          <span className="text-brand-text">#label</span> ·{" "}
          <span className="text-brand-text">!high</span>{" "}
          <span className="text-brand-text">!urgent</span>
        </span>
      </footer>
    </div>
  );
}
