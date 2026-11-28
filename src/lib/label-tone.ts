/**
 * Each label keeps one colour everywhere (cards, filters, drawer), picked from its name.
 * Danger is left out so a label never reads as "overdue". Text colours meet AA on the tints.
 */
const LABEL_TONES = [
  { chip: "bg-brand/15 text-brand-text", text: "text-brand-text" },
  { chip: "bg-accent/12 text-accent", text: "text-accent" },
  { chip: "bg-info/12 text-info", text: "text-info" },
  { chip: "bg-success/12 text-success", text: "text-success" },
  { chip: "bg-warning/12 text-warning", text: "text-warning" },
] as const;

export type LabelTone = (typeof LABEL_TONES)[number];

export function labelTone(label: string): LabelTone {
  let hash = 0;
  for (const char of label.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return LABEL_TONES[hash % LABEL_TONES.length] ?? LABEL_TONES[0];
}
