import { describe, expect, it } from "vitest";
import { createErrorTracker, createMemoryErrorTracker } from "./error-tracking.js";

describe("error tracking", () => {
  it("captures 500 errors with request context", () => {
    const tracker = createMemoryErrorTracker();
    tracker.captureException(new Error("boom"), {
      requestId: "req-42",
      route: "/api/v1/analyze/transaction",
      method: "POST",
      statusCode: 500,
    });

    expect(tracker.events).toHaveLength(1);
    expect(tracker.events[0]).toMatchObject({
      requestId: "req-42",
      route: "/api/v1/analyze/transaction",
      method: "POST",
      statusCode: 500,
      errorType: "Error",
      message: "boom",
    });
  });

  it("ignores non-5xx statuses", () => {
    const tracker = createMemoryErrorTracker();
    tracker.captureException(new Error("nope"), {
      requestId: "req-1",
      route: "/api/v1/health",
      method: "GET",
      statusCode: 400,
    });
    expect(tracker.events).toHaveLength(0);
  });

  it("redacts sensitive messages and never stores private key material", () => {
    const tracker = createMemoryErrorTracker();
    tracker.captureException(new Error("privateKey=abc mnemonic leaked"), {
      requestId: "req-9",
      route: "/api/v1/account/:address",
      method: "GET",
      statusCode: 500,
    });
    expect(tracker.events[0]?.message).toBe("[redacted]");
    expect(JSON.stringify(tracker.events)).not.toMatch(/privateKey|mnemonic|abc/i);
  });

  it("logger-backed tracker emits structured capture events without secrets", () => {
    const calls: unknown[] = [];
    const log = {
      error: (obj: unknown, msg?: string) => {
        calls.push({ obj, msg });
      },
    };
    const tracker = createErrorTracker(log as never);
    tracker.captureException(new Error("adapter failed"), {
      requestId: "rid",
      route: "/api/v1/rpc/status",
      method: "GET",
      statusCode: 500,
    });

    expect(calls.length).toBeGreaterThanOrEqual(1);
    const serialized = JSON.stringify(calls);
    expect(serialized).toContain("rid");
    expect(serialized).toContain("/api/v1/rpc/status");
    expect(serialized).toContain("error_tracking.capture");
    expect(serialized).not.toMatch(/privateKey|mnemonic|authorization/i);
  });
});
