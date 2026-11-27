import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

const app = manifest();

/** Reads width/height from a PNG's IHDR chunk. */
function pngSize(publicPath: string): string {
  const png = readFileSync(new URL(`../../public${publicPath}`, import.meta.url));
  return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
}

describe("web app manifest", () => {
  it("meets Chrome's installability requirements", () => {
    expect(app.name).toBeTruthy();
    expect(app.short_name).toBeTruthy();
    expect(app.display).toBe("standalone");
    expect(app.start_url?.startsWith(app.scope ?? "/")).toBe(true);

    const anyIcons = app.icons?.filter((icon) => icon.purpose === "any").map((icon) => icon.sizes);
    expect(anyIcons).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  });

  it("ships maskable icons for Android and desktop launchers", () => {
    const maskable = app.icons
      ?.filter((icon) => icon.purpose === "maskable")
      .map((icon) => icon.sizes);
    expect(maskable).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  });

  it("points every icon at a PNG whose real size matches its declared size", () => {
    const icons = [
      ...(app.icons ?? []),
      ...(app.shortcuts ?? []).flatMap((shortcut) => shortcut.icons ?? []),
    ];
    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) {
      expect(pngSize(icon.src), icon.src).toBe(icon.sizes);
    }
  });

  it("offers the New task and This week shortcuts", () => {
    expect(app.shortcuts?.map((shortcut) => shortcut.name)).toEqual(["New task", "This week"]);
  });
});
