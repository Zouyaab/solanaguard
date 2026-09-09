import { describe, expect, it } from "vitest";
import { MetricsRegistry } from "./metrics.js";

describe("MetricsRegistry", () => {
  it("tracks request counts, client/server errors, and duration stats", () => {
    const metrics = new MetricsRegistry();
    metrics.recordRequest(10, 200);
    metrics.recordRequest(20, 404);
    metrics.recordRequest(30, 500);
    metrics.recordAnalysisDuration(40);

    const snapshot = metrics.snapshot();
    expect(snapshot.requestsTotal).toBe(3);
    expect(snapshot.clientErrorTotal).toBe(1);
    expect(snapshot.errorsTotal).toBe(1);
    expect(snapshot.serverErrorTotal).toBe(1);
    expect(snapshot.requestDurationMsAvg).toBe(20);
    expect(snapshot.requestDurationMsMax).toBe(40);
  });

  it("ignores invalid analysis durations and resets cleanly", () => {
    const metrics = new MetricsRegistry();
    metrics.recordRequest(5, 200);
    metrics.recordAnalysisDuration(Number.NaN);
    metrics.recordAnalysisDuration(-1);
    expect(metrics.snapshot().requestDurationMsMax).toBe(5);
    metrics.reset();
    expect(metrics.snapshot()).toEqual({
      requestsTotal: 0,
      errorsTotal: 0,
      clientErrorTotal: 0,
      serverErrorTotal: 0,
      requestDurationMsAvg: 0,
      requestDurationMsMax: 0,
    });
  });
});
