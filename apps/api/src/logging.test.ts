import { describe, expect, it, vi } from "vitest";
import { SolanaRpc, stubNormalizedSimulation, type SolanaRpcAdapter } from "@solanaguard/solana";
import { buildApp } from "./app.js";
import { LOG_REDACT_PATHS, logServerError } from "./logging.js";
import { MetricsRegistry } from "./metrics.js";

function mockRpc(overrides: Partial<SolanaRpcAdapter> = {}): SolanaRpc {
  const adapter: SolanaRpcAdapter = {
    getHealth: vi.fn(async () => "ok"),
    getSlot: vi.fn(async () => 42),
    getLatestBlockhash: vi.fn(async () => ({
      blockhash: "11111111111111111111111111111111",
      lastValidBlockHeight: 1,
    })),
    getAccount: vi.fn(async () => null),
    getMultipleAccounts: vi.fn(async (addresses: string[]) => addresses.map(() => null)),
    getTransaction: vi.fn(async () => null),
    getTransactionWire: vi.fn(async () => null),
    getBalance: vi.fn(async () => 0n),
    simulateTransactionBytes: vi.fn(async () => stubNormalizedSimulation()),
    ...overrides,
  };
  return new SolanaRpc(adapter, "https://api.devnet.solana.com");
}

describe("structured logging", () => {
  it("starts with logging enabled", async () => {
    const app = await buildApp({
      logger: true,
      logLevel: "warn",
      hardening: { enableRateLimit: false },
    });
    const response = await app.inject({ method: "GET", url: "/api/v1/health" });
    expect(response.statusCode).toBe(200);
    expect(app.log).toBeDefined();
    await app.close();
  });

  it("redacts secret field paths by configuration", () => {
    expect(LOG_REDACT_PATHS).toEqual(
      expect.arrayContaining([
        "req.headers.authorization",
        "req.body.privateKey",
        "req.body.mnemonic",
      ]),
    );
  });

  it("logServerError records request metadata without payloads", () => {
    const calls: unknown[] = [];
    const log = {
      error: (obj: unknown, msg?: string) => {
        calls.push({ obj, msg });
      },
    };
    logServerError(
      log as never,
      {
        requestId: "req-1",
        route: "/api/v1/account/:address",
        method: "GET",
        statusCode: 500,
        errMessage: "boom",
      },
      new Error("boom"),
    );
    expect(calls).toHaveLength(1);
    const entry = calls[0] as { obj: Record<string, unknown>; msg: string };
    expect(entry.msg).toMatch(/server error/);
    expect(entry.obj.requestId).toBe("req-1");
    expect(entry.obj.route).toBe("/api/v1/account/:address");
    expect(entry.obj.method).toBe("GET");
    expect(entry.obj.statusCode).toBe(500);
    expect(JSON.stringify(entry)).not.toMatch(/privateKey|mnemonic|base64/i);
  });

  it("unexpected handler failures return 500 without stack traces and increment error metrics", async () => {
    const metrics = new MetricsRegistry();
    const app = await buildApp({
      logger: true,
      logLevel: "error",
      metrics,
      hardening: { enableRateLimit: false },
      rpc: mockRpc({
        getAccount: vi.fn(async () => {
          throw new Error("unexpected adapter failure");
        }),
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/account/11111111111111111111111111111111",
      headers: { "x-request-id": "test-req-123" },
    });
    expect(response.statusCode).toBe(500);
    const body = response.json() as { error: string; message: string };
    expect(body.error).toBe("internal");
    expect(body).not.toHaveProperty("stack");
    expect(JSON.stringify(body)).not.toMatch(/privateKey|mnemonic/i);

    const snapshot = metrics.snapshot();
    expect(snapshot.errorsTotal).toBeGreaterThanOrEqual(1);
    await app.close();
  });
});

describe("metrics endpoint", () => {
  it("exposes counters without sensitive fields", async () => {
    const metrics = new MetricsRegistry();
    const app = await buildApp({
      metrics,
      hardening: { enableRateLimit: false },
    });
    await app.inject({ method: "GET", url: "/api/v1/health" });
    const response = await app.inject({ method: "GET", url: "/api/v1/metrics" });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      requestsTotal: number;
      errorsTotal: number;
      requestDurationMsAvg: number;
      requestDurationMsMax: number;
    };
    expect(body.requestsTotal).toBeGreaterThanOrEqual(1);
    expect(body.errorsTotal).toBe(0);
    expect(JSON.stringify(body)).not.toMatch(/privateKey|authorization|base64/i);
    await app.close();
  });
});
