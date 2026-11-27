import { describe, expect, it } from "vitest";
import { compareOrder, generateKeyBetween, isValidOrderKey } from "@/lib/domain/ordering";

describe("generateKeyBetween", () => {
  it("starts from a0 and steps the integer part at the ends", () => {
    expect(generateKeyBetween(null, null)).toBe("a0");
    expect(generateKeyBetween("a0", null)).toBe("a1");
    expect(generateKeyBetween(null, "a0")).toBe("Zz");
    expect(generateKeyBetween("az", null)).toBe("b00");
    expect(generateKeyBetween(null, "b00")).toBe("az");
  });

  it("splits the gap between neighbours", () => {
    expect(generateKeyBetween("a0", "a1")).toBe("a0V");
    expect(generateKeyBetween("a0V", "a1")).toBe("a0l");
    expect(generateKeyBetween("a0", "a0V")).toBe("a0G");
    expect(generateKeyBetween("a1", "a2")).toBe("a1V");
  });

  it("produces a strictly ordered key for every insert position", () => {
    const before = "a0";
    const after = "a1";
    const key = generateKeyBetween(before, after);
    expect(before < key && key < after).toBe(true);
  });

  it("stays sorted and short after 1,000 appends", () => {
    const keys: string[] = [];
    let last: string | null = null;
    for (let i = 0; i < 1000; i++) {
      last = generateKeyBetween(last, null);
      keys.push(last);
    }
    expect([...keys].sort()).toEqual(keys);
    expect(Math.max(...keys.map((key) => key.length))).toBeLessThanOrEqual(3);
  });

  it("stays sorted after 1,000 prepends", () => {
    const keys: string[] = [];
    let first: string | null = null;
    for (let i = 0; i < 1000; i++) {
      first = generateKeyBetween(null, first);
      keys.unshift(first);
    }
    expect([...keys].sort()).toEqual(keys);
  });

  it("keeps finding room when inserting into the same gap 500 times", () => {
    const low = "a0";
    let high = "a1";
    for (let i = 0; i < 500; i++) {
      const key = generateKeyBetween(low, high);
      expect(low < key && key < high).toBe(true);
      high = key;
    }
    // Each halving costs ~1 bit; 62 symbols carry ~6 bits, so length grows ~1 char per 6 inserts.
    expect(high.length).toBeLessThan(100);
  });

  it("rejects keys in the wrong order or with invalid spelling", () => {
    expect(() => generateKeyBetween("a1", "a0")).toThrow();
    expect(() => generateKeyBetween("a0", "a0")).toThrow();
    expect(() => generateKeyBetween("a10", null)).toThrow(); // trailing zero in fraction
    expect(() => generateKeyBetween("!", null)).toThrow();
  });
});

describe("isValidOrderKey", () => {
  it("accepts generated keys and rejects malformed ones", () => {
    expect(isValidOrderKey("a0")).toBe(true);
    expect(isValidOrderKey("a0V")).toBe(true);
    expect(isValidOrderKey("Zz")).toBe(true);
    expect(isValidOrderKey("")).toBe(false);
    expect(isValidOrderKey("a")).toBe(false);
    expect(isValidOrderKey("a00")).toBe(false);
    expect(isValidOrderKey("a0!")).toBe(false);
  });
});

describe("compareOrder", () => {
  it("sorts by key in byte order, then by id for identical keys", () => {
    const items = [
      { order: "a1", id: "b" },
      { order: "a0V", id: "z" },
      { order: "a1", id: "a" },
      { order: "Zz", id: "m" },
    ];
    expect(items.sort(compareOrder).map((item) => `${item.order}:${item.id}`)).toEqual([
      "Zz:m",
      "a0V:z",
      "a1:a",
      "a1:b",
    ]);
  });
});
