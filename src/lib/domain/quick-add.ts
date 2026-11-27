import { normalizeLabels, type Priority } from "./task";

export interface QuickAddResult {
  title: string;
  labels: string[];
  priority: Priority | null;
}

const PRIORITY_TOKENS: Record<string, Priority> = {
  low: "low",
  med: "medium",
  medium: "medium",
  high: "high",
  urgent: "urgent",
};

const LABEL_TOKEN = /^#([\p{L}\p{N}_-]+)$/u;
const PRIORITY_TOKEN = /^!(\p{L}+)$/u;

/**
 * Parses quick-add input such as "Pay rent #home !high".
 * `#word` adds a label, `!low|!med|!medium|!high|!urgent` sets priority (last one wins);
 * every other word is part of the title. Unknown `!tokens` stay in the title.
 */
export function parseQuickAdd(input: string): QuickAddResult {
  const titleWords: string[] = [];
  const labels: string[] = [];
  let priority: Priority | null = null;

  for (const word of input.trim().split(/\s+/)) {
    const label = LABEL_TOKEN.exec(word)?.[1];
    const priorityWord = PRIORITY_TOKEN.exec(word)?.[1]?.toLowerCase();
    const matchedPriority = priorityWord ? PRIORITY_TOKENS[priorityWord] : undefined;

    if (label) labels.push(label);
    else if (matchedPriority) priority = matchedPriority;
    else if (word) titleWords.push(word);
  }

  return { title: titleWords.join(" "), labels: normalizeLabels(labels), priority };
}
