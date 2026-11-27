/**
 * Fractional indexing: string keys that sort lexicographically (byte order, as MongoDB
 * compares strings), with a fresh key always available between any two neighbours.
 * Moving a task writes one key; nothing else is renumbered.
 *
 * Key = integer part + optional fraction. The head character encodes the integer part's
 * length ("a".."z" → 2..27 positive, "Z".."A" → 2..27 negative), so integers sort
 * correctly as strings. Fractions never end in "0", so every key has a unique spelling.
 * Based on David Greenspan's "Implementing Fractional Indexing".
 */

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE = DIGITS.length;
const ZERO_KEY = "a0";
const SMALLEST_INTEGER = `A${"0".repeat(26)}`;

function digitValue(char: string | undefined): number {
  const value = char === undefined ? -1 : DIGITS.indexOf(char);
  if (value === -1) throw new Error(`Invalid order key digit: ${String(char)}`);
  return value;
}

function digitAt(value: number): string {
  const char = DIGITS[value];
  if (char === undefined) throw new Error(`Digit out of range: ${value}`);
  return char;
}

function integerLength(head: string): number {
  if (head >= "a" && head <= "z") return head.charCodeAt(0) - "a".charCodeAt(0) + 2;
  if (head >= "A" && head <= "Z") return "Z".charCodeAt(0) - head.charCodeAt(0) + 2;
  throw new Error(`Invalid order key head: ${head}`);
}

function splitKey(key: string): { integer: string; fraction: string } {
  const head = key[0];
  if (head === undefined) throw new Error("Order key is empty");
  const length = integerLength(head);
  if (length > key.length) throw new Error(`Invalid order key: ${key}`);
  return { integer: key.slice(0, length), fraction: key.slice(length) };
}

function assertValidKey(key: string): void {
  if (key === SMALLEST_INTEGER) throw new Error(`Invalid order key: ${key}`);
  const { fraction } = splitKey(key);
  for (const char of key.slice(1)) digitValue(char);
  if (fraction.endsWith("0")) throw new Error(`Invalid order key: ${key}`);
}

export function isValidOrderKey(key: string): boolean {
  try {
    assertValidKey(key);
    return true;
  } catch {
    return false;
  }
}

/** A fraction strictly between `a` and `b` (`b === null` means "no upper bound"). */
function midpoint(a: string, b: string | null): string {
  if (b !== null && a >= b) throw new Error(`${a} >= ${b}`);
  if (a.endsWith("0") || b?.endsWith("0")) throw new Error("Fraction has a trailing zero");

  if (b !== null) {
    let shared = 0;
    while ((a[shared] ?? "0") === b[shared]) shared++;
    if (shared > 0) return b.slice(0, shared) + midpoint(a.slice(shared), b.slice(shared));
  }

  const digitA = a.length > 0 ? digitValue(a[0]) : 0;
  const digitB = b === null ? BASE : digitValue(b[0]);
  if (digitB - digitA > 1) return digitAt(Math.round((digitA + digitB) / 2));
  if (b !== null && b.length > 1) return b.slice(0, 1);
  return digitAt(digitA) + midpoint(a.slice(1), null);
}

function incrementInteger(integer: string): string | null {
  const head = integer.slice(0, 1);
  const digits = [...integer.slice(1)];
  let carry = true;
  for (let i = digits.length - 1; carry && i >= 0; i--) {
    const next = digitValue(digits[i]) + 1;
    if (next === BASE) {
      digits[i] = "0";
    } else {
      digits[i] = digitAt(next);
      carry = false;
    }
  }
  if (!carry) return head + digits.join("");
  if (head === "Z") return ZERO_KEY;
  if (head === "z") return null;
  const nextHead = String.fromCharCode(head.charCodeAt(0) + 1);
  if (nextHead > "a") digits.push("0");
  else digits.pop();
  return nextHead + digits.join("");
}

function decrementInteger(integer: string): string | null {
  const head = integer.slice(0, 1);
  const digits = [...integer.slice(1)];
  let borrow = true;
  for (let i = digits.length - 1; borrow && i >= 0; i--) {
    const next = digitValue(digits[i]) - 1;
    if (next === -1) {
      digits[i] = digitAt(BASE - 1);
    } else {
      digits[i] = digitAt(next);
      borrow = false;
    }
  }
  if (!borrow) return head + digits.join("");
  if (head === "a") return `Z${digitAt(BASE - 1)}`;
  if (head === "A") return null;
  const previousHead = String.fromCharCode(head.charCodeAt(0) - 1);
  if (previousHead < "Z") digits.push(digitAt(BASE - 1));
  else digits.pop();
  return previousHead + digits.join("");
}

/**
 * Returns a key that sorts strictly between `before` and `after`.
 * Pass `null` for an open end: (null, first) prepends, (last, null) appends.
 */
export function generateKeyBetween(before: string | null, after: string | null): string {
  if (before !== null) assertValidKey(before);
  if (after !== null) assertValidKey(after);
  if (before !== null && after !== null && before >= after) {
    throw new Error(`Order keys out of order: ${before} >= ${after}`);
  }

  if (before === null) {
    if (after === null) return ZERO_KEY;
    const { integer, fraction } = splitKey(after);
    if (integer === SMALLEST_INTEGER) return integer + midpoint("", fraction);
    if (integer < after) return integer;
    const decremented = decrementInteger(integer);
    if (decremented === null) throw new Error("Cannot generate a smaller order key");
    return decremented;
  }

  const a = splitKey(before);
  if (after === null) {
    const incremented = incrementInteger(a.integer);
    return incremented ?? a.integer + midpoint(a.fraction, null);
  }

  const b = splitKey(after);
  if (a.integer === b.integer) return a.integer + midpoint(a.fraction, b.fraction);
  const incremented = incrementInteger(a.integer);
  if (incremented === null) throw new Error("Cannot generate a larger order key");
  if (incremented < after) return incremented;
  return a.integer + midpoint(a.fraction, null);
}

/** Byte-order comparison matching MongoDB's default string sort, tie-broken by id. */
export function compareOrder(
  a: { order: string; id: string },
  b: { order: string; id: string },
): number {
  if (a.order !== b.order) return a.order < b.order ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}
