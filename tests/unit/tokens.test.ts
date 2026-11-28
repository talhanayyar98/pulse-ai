import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LABEL_TONES } from "@/lib/label-tone";
import { palette } from "@/lib/theme";
import { composite, contrastRatio, parseColor } from "../support/color";

const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");

function readColorTokens(): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const match of css.matchAll(/--color-([a-z-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name && value && value !== "initial") tokens.set(name, value.trim());
  }
  return tokens;
}

const tokens = readColorTokens();

function token(name: string) {
  const value = tokens.get(name);
  if (!value) throw new Error(`Missing token --color-${name}`);
  return parseColor(value);
}

/** `name` drawn at `alpha` over an opaque background, e.g. Tailwind's `bg-info/10`. */
function tint(name: string, alpha: number, over: string) {
  return composite({ ...token(name), a: alpha }, token(over));
}

const AA_NORMAL_TEXT = 4.5;
const AA_NON_TEXT = 3;
const PAPER = ["canvas", "surface", "sunken"] as const;
const COLUMN_TINTS = ["slate-soft", "info-soft", "progress-soft", "success-soft"] as const;

describe("design tokens", () => {
  it("keeps src/lib/theme.ts in sync with the CSS tokens", () => {
    expect(tokens.get("canvas")).toBe(palette.canvas);
    expect(tokens.get("nav")).toBe(palette.nav);
    expect(tokens.get("brand")).toBe(palette.brand);
    expect(tokens.get("brand-strong")).toBe(palette.brandStrong);
    expect(tokens.get("on-brand")).toBe(palette.onBrand);
  });

  const textOnPaper = [
    "fg",
    "fg-secondary",
    "fg-muted",
    "brand-text",
    "slate",
    "info",
    "progress",
    "success",
    "warning",
    "danger",
    "teal",
    "plum",
  ];
  for (const text of textOnPaper) {
    for (const surface of [...PAPER, ...COLUMN_TINTS]) {
      it(`${text} on ${surface} meets WCAG AA`, () => {
        expect(contrastRatio(token(text), token(surface))).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      });
    }
  }

  for (const text of ["nav-fg", "nav-fg-muted", "nav-accent"]) {
    for (const surface of ["nav", "nav-raised"]) {
      it(`${text} on ${surface} meets WCAG AA`, () => {
        expect(contrastRatio(token(text), token(surface))).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      });
    }
  }

  // White text on filled colours: the CTA gradient's ends, count badges, the checked checkbox.
  for (const fill of [
    "brand",
    "brand-strong",
    "danger-strong",
    "slate",
    "info",
    "progress",
    "success",
  ]) {
    it(`on-brand on ${fill} meets WCAG AA`, () => {
      expect(contrastRatio(token("on-brand"), token(fill))).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });
  }

  // Coloured text on a 10% tint of a colour: label chips, due badges, selected filter chips.
  const labelPairs = LABEL_TONES.map(({ chip }) => {
    const match = /^bg-([a-z-]+)\/(\d+) text-([a-z-]+)$/.exec(chip);
    if (!match?.[1] || !match[2] || !match[3]) throw new Error(`Unexpected label chip: ${chip}`);
    return { text: match[3], fill: match[1], alpha: Number(match[2]) / 100 };
  });
  const tintedPairs = [
    ...labelPairs,
    { text: "warning", fill: "warning", alpha: 0.1 },
    { text: "danger", fill: "danger", alpha: 0.1 },
    { text: "brand-text", fill: "brand", alpha: 0.1 },
  ];
  for (const { text, fill, alpha } of tintedPairs) {
    for (const over of ["canvas", "surface"]) {
      it(`${text} on ${fill}/${alpha * 100} over ${over} meets WCAG AA`, () => {
        expect(contrastRatio(token(text), tint(fill, alpha, over))).toBeGreaterThanOrEqual(
          AA_NORMAL_TEXT,
        );
      });
    }
  }

  for (const surface of [...PAPER, ...COLUMN_TINTS, "nav"]) {
    it(`the focus ring stands out on ${surface}`, () => {
      expect(contrastRatio(token("focus"), token(surface))).toBeGreaterThanOrEqual(AA_NON_TEXT);
    });
  }

  it("never names a color token after a font-size token (text-base would set both)", () => {
    const fontSizes = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"];
    expect([...tokens.keys()].filter((name) => fontSizes.includes(name))).toEqual([]);
  });
});
