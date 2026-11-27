import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "@/lib/domain/quick-add";

describe("parseQuickAdd", () => {
  it("extracts labels and priority from anywhere in the text", () => {
    expect(parseQuickAdd("Pay rent #home !high")).toEqual({
      title: "Pay rent",
      labels: ["home"],
      priority: "high",
    });
    expect(parseQuickAdd("#work !urgent Ship   release notes")).toEqual({
      title: "Ship release notes",
      labels: ["work"],
      priority: "urgent",
    });
  });

  it("accepts !med as medium and lets the last priority win", () => {
    expect(parseQuickAdd("Plan !low !med").priority).toBe("medium");
  });

  it("dedupes labels case-insensitively and supports unicode", () => {
    expect(parseQuickAdd("Café #Café #café #déjà-vu").labels).toEqual(["Café", "déjà-vu"]);
  });

  it("keeps unknown tokens and bare symbols in the title", () => {
    expect(parseQuickAdd("Wow !amazing # #")).toEqual({
      title: "Wow !amazing # #",
      labels: [],
      priority: null,
    });
  });

  it("returns an empty title when the input is only tokens", () => {
    expect(parseQuickAdd("  #home !high ").title).toBe("");
  });
});
