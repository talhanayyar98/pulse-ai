"use client";

import { LIMITS } from "@/lib/domain/task";
import { useDraft } from "@/lib/hooks/use-draft";

export function TitleField({
  value,
  onCommit,
}: Readonly<{ value: string; onCommit: (title: string) => void }>) {
  const { draft, setDraft, flush } = useDraft(value, (next) => {
    const title = next.trim();
    if (title) onCommit(title);
  });

  return (
    <textarea
      aria-label="Title"
      value={draft}
      maxLength={LIMITS.title}
      rows={1}
      onChange={(event) => setDraft(event.target.value.replace(/\n/g, " "))}
      onBlur={() => {
        if (!draft.trim()) setDraft(value);
        flush();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className="field-sizing-content w-full resize-none rounded-lg bg-transparent text-2xl leading-tight font-semibold tracking-tight text-fg outline-offset-4"
    />
  );
}
