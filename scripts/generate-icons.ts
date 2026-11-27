/**
 * Generates every app icon from the glyphs in assets/brand/ (run: npm run icons).
 * Renders with Playwright's Chromium so no image libraries are needed. Outputs are committed.
 */
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { palette } from "../src/lib/theme.ts";

type Variant = "app" | "maskable" | "apple" | "tile";

/** Geometry per variant, in the 64-unit icon grid. */
const VARIANTS: Record<Variant, { inset: number; radius: number; glyphScale: number }> = {
  // macOS-style: rounded body with ~10% transparent margin (Chrome on macOS shows it unmasked).
  app: { inset: 6.25, radius: 12, glyphScale: 0.68 },
  // Full bleed; glyph stays inside the 80% safe circle that platforms may crop to.
  maskable: { inset: 0, radius: 0, glyphScale: 0.6 },
  // Full bleed; Apple applies its own rounded mask.
  apple: { inset: 0, radius: 0, glyphScale: 0.72 },
  // Favicons and shortcut icons: fill the canvas, lightly rounded.
  tile: { inset: 0, radius: 14, glyphScale: 0.8 },
};

const root = new URL("../", import.meta.url);

async function readGlyph(name: string): Promise<string> {
  const svg = await readFile(new URL(`assets/brand/${name}.svg`, root), "utf8");
  const inner = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(svg)?.[1];
  if (!inner) throw new Error(`assets/brand/${name}.svg has no <svg> body`);
  return inner.trim();
}

function composeSvg(glyph: string, variant: Variant): string {
  const { inset, radius, glyphScale } = VARIANTS[variant];
  const size = 64 - inset * 2;
  const offset = 32 * (1 - glyphScale);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette.brandStrong}"/>
      <stop offset="1" stop-color="${palette.brandDeep}"/>
    </linearGradient>
    <radialGradient id="shine" cx="0.25" cy="0.15" r="0.85">
      <stop offset="0" stop-color="${palette.brand}" stop-opacity="0.7"/>
      <stop offset="1" stop-color="${palette.brand}" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.6"/>
    </filter>
  </defs>
  <rect x="${inset}" y="${inset}" width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
  <rect x="${inset}" y="${inset}" width="${size}" height="${size}" rx="${radius}" fill="url(#shine)"/>
  <g transform="translate(${offset} ${offset}) scale(${glyphScale})" color="${palette.neon}">
    <g filter="url(#glow)" opacity="0.75">${glyph}</g>
    ${glyph}
  </g>
</svg>`;
}

/** ICO container holding PNG frames (supported by every current browser). */
function encodeIco(frames: Array<{ size: number; png: Buffer }>): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length + frames.length * 16;
  const entries = frames.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...frames.map((frame) => frame.png)]);
}

const browser = await chromium.launch();
const page = await browser.newPage();

async function render(svg: string, size: number): Promise<Buffer> {
  await page.setViewportSize({ width: size, height: size });
  const sized = svg.replace("<svg ", `<svg width="${size}" height="${size}" `);
  await page.setContent(`<!doctype html><body style="margin:0;background:transparent">${sized}`);
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}

async function write(path: string, data: Buffer | string): Promise<void> {
  await writeFile(new URL(path, root), data);
  console.log(`  wrote ${path}`);
}

try {
  const mark = await readGlyph("mark");

  for (const size of [192, 512]) {
    await write(`public/icons/icon-${size}.png`, await render(composeSvg(mark, "app"), size));
    await write(
      `public/icons/maskable-${size}.png`,
      await render(composeSvg(mark, "maskable"), size),
    );
  }

  for (const name of ["new-task", "this-week"]) {
    const glyph = await readGlyph(`shortcut-${name}`);
    await write(`public/icons/shortcut-${name}.png`, await render(composeSvg(glyph, "tile"), 96));
  }

  await write("src/app/apple-icon.png", await render(composeSvg(mark, "apple"), 512));
  await write("src/app/icon.svg", `${composeSvg(mark, "tile")}\n`);

  const faviconFrames = [];
  for (const size of [16, 32, 48]) {
    faviconFrames.push({ size, png: await render(composeSvg(mark, "tile"), size) });
  }
  await write("src/app/favicon.ico", encodeIco(faviconFrames));
} finally {
  await browser.close();
}
