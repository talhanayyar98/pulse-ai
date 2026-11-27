import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { palette } from "@/lib/theme";
import { contrastRatio, parseColor } from "../support/color";

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

const AA_NORMAL_TEXT = 4.5;
const SURFACES = ["base", "surface", "surface-raised"] as const;

describe("design tokens", () => {
  it("keeps src/lib/theme.ts in sync with the CSS tokens", () => {
    expect(tokens.get("base")).toBe(palette.base);
    expect(tokens.get("brand")).toBe(palette.brand);
    expect(tokens.get("brand-deep")).toBe(palette.brandDeep);
    expect(tokens.get("brand-strong")).toBe(palette.brandStrong);
    expect(tokens.get("neon")).toBe(palette.neon);
  });

  const textOnSurfaces = ["fg", "fg-secondary", "fg-muted", "brand-text", "neon"];
  for (const text of textOnSurfaces) {
    for (const surface of SURFACES) {
      it(`${text} on ${surface} meets WCAG AA`, () => {
        expect(contrastRatio(token(text), token(surface))).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      });
    }
  }

  const filledPairs = [
    ["on-neon", "neon"],
    ["on-brand", "brand-strong"],
    ["on-brand", "brand-deep"],
  ] as const;
  for (const [text, fill] of filledPairs) {
    it(`${text} on ${fill} meets WCAG AA`, () => {
      expect(contrastRatio(token(text), token(fill))).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });
  }

  it("documents why raw brand purple is not a text color on cards", () => {
    expect(contrastRatio(token("brand"), token("surface-raised"))).toBeLessThan(AA_NORMAL_TEXT);
  });
});
