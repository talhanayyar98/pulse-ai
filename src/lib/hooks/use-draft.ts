"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Local editing state for a field that saves on blur rather than on every keystroke.
 * - External changes to `value` (e.g. from another device) replace the draft.
 * - `flush()` commits if the draft differs; it also runs on unmount, so closing the drawer
 *   with Esc never loses an edit.
 */
export function useDraft<T>(
  value: T,
  commit: (next: T) => void,
  isEqual: (a: T, b: T) => boolean = Object.is,
) {
  const [draft, setDraft] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  if (!isEqual(value, syncedValue)) {
    setSyncedValue(value);
    setDraft(value);
  }

  const latest = useRef({ draft, value, commit, isEqual });
  useEffect(() => {
    latest.current = { draft, value, commit, isEqual };
  });

  const flush = useCallback(() => {
    const current = latest.current;
    if (!current.isEqual(current.draft, current.value)) current.commit(current.draft);
  }, []);

  useEffect(() => flush, [flush]);

  return { draft, setDraft, flush };
}
