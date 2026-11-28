/**
 * Each label keeps one colour everywhere (cards, filters, drawer), picked from its name.
 * Danger and warning are left out so a label never reads as "overdue" or "due soon".
 * Text colours meet AA on the tints (tests/unit/tokens.test.ts).
 */
export const LABEL_TONES = [
  { chip: "bg-info/10 text-info", text: "text-info" },
  { chip: "bg-teal/10 text-teal", text: "text-teal" },
  { chip: "bg-success/10 text-success", text: "text-success" },
  { chip: "bg-progress/10 text-progress", text: "text-progress" },
  { chip: "bg-brand-text/10 text-brand-text", text: "text-brand-text" },
  { chip: "bg-plum/10 text-plum", text: "text-plum" },
] as const;

export type LabelTone = (typeof LABEL_TONES)[number];

export function labelTone(label: string): LabelTone {
  let hash = 0;
  for (const char of label.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return LABEL_TONES[hash % LABEL_TONES.length] ?? LABEL_TONES[0];
}
