/**
 * Raw palette values for places that cannot read CSS variables
 * (web manifest, viewport meta, generated icons).
 * Must match the tokens in src/app/globals.css — enforced by tests/unit/tokens.test.ts.
 */
export const palette = {
  canvas: "#0b0a16",
  brand: "#8b5cf6",
  brandDeep: "#5b21b6",
  brandStrong: "#7c3aed",
  accent: "#e879f9",
  accentDeep: "#c026d3",
  onBrand: "#ffffff",
} as const;
