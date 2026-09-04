import { describe, expect, it } from "vitest";
import { percentile, summarize } from "./stats.js";

describe("benchmark stats helpers", () => {
  it("computes percentiles from sorted samples without inventing values", () => {
    const samples = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(samples, 50)).toBe(5);
    expect(percentile(samples, 95)).toBe(10);
    expect(percentile([], 50)).toBeNaN();
  });

  it("summarizes measured samples only", () => {
    const stats = summarize("demo", [10, 20, 30]);
    expect(stats.iterations).toBe(3);
    expect(stats.minMs).toBe(10);
    expect(stats.maxMs).toBe(30);
    expect(stats.meanMs).toBe(20);
    expect(stats.p50Ms).toBe(20);
  });
});
