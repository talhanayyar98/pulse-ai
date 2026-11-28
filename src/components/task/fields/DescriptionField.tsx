"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import { Segmented } from "@/components/ui/Segmented";
import { LIMITS } from "@/lib/domain/task";
import { useDraft } from "@/lib/hooks/use-draft";

type Mode = "write" | "preview";

const MODES = [
  { value: "write", label: "Write" },
  { value: "preview", label: "Preview" },
] as const;

/** Markdown description. Raw HTML is not rendered (react-markdown's default), so it is XSS-safe. */
export function DescriptionField({
  value,
  onCommit,
}: Readonly<{ value: string; onCommit: (description: string) => void }>) {
  const [mode, setMode] = useState<Mode>(value ? "preview" : "write");
  const { draft, setDraft, flush } = useDraft(value, onCommit);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg leading-none">Description</h3>
        <Segmented
          label="Description mode"
          value={mode}
          options={MODES}
          onChange={(next) => {
            flush();
            setMode(next);
          }}
        />
      </div>
      {mode === "write" ? (
        <textarea
          aria-label="Description"
          value={draft}
          maxLength={LIMITS.description}
          placeholder="Add details, links, checklists… Markdown works."
          onChange={(event) => setDraft(event.target.value)}
          onBlur={flush}
          className="min-h-40 w-full resize-y field leading-relaxed"
        />
      ) : draft ? (
        <div className="markdown animate-fade-up rounded-xl border border-line bg-canvas px-4 py-3">
          <Markdown
            components={{
              a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
            }}
          >
            {draft}
          </Markdown>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setMode("write")}
          className="w-full rounded-xl border border-dashed border-line-strong px-4 py-6 text-sm text-fg-muted transition-colors duration-200 hover:border-brand/45 hover:bg-brand/5 hover:text-fg-secondary"
        >
          No description yet. Click to write one.
        </button>
      )}
    </div>
  );
}
