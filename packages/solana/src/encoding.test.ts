import { describe, expect, it } from "vitest";
import { decodeBase58, encodeBase58, isAllZero } from "./encoding.js";

describe("base58 helpers", () => {
  it("round-trips bytes", () => {
    const bytes = Uint8Array.from([1, 2, 3, 4, 5]);
    expect(decodeBase58(encodeBase58(bytes))).toEqual(bytes);
  });

  it("detects all-zero signatures", () => {
    expect(isAllZero(new Uint8Array(64))).toBe(true);
    const nonzero = new Uint8Array(64);
    nonzero[0] = 1;
    expect(isAllZero(nonzero)).toBe(false);
  });
});
