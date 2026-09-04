import { describe, expect, it, vi } from "vitest";
import { SOLANAGUARD_NAME, SOLANAGUARD_VERSION } from "@solanaguard/types";
import { SolanaRpc, stubNormalizedSimulation, type SolanaRpcAdapter } from "@solanaguard/solana";
import { buildApp } from "./app.js";

const TRANSFER_BASE64 =
  "Aecq9mMF4htQuahqnrKRXHzGPmtuxSNj3PCHqwV+aESk4I3P/1AGM7tneIzgF4eNbTZwmDDTGz4rED2UfyWGtgKAAQABAwafd7Wj1Am+2iNI3JDf0BDwxjcevjSU6u+w7PElwShXB8c/1UTJwIVBcsnyguiJJXGSUgVkHRojpkD+x44QnbIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQICAAEMAgAAAAEAAAAAAAAAAA==";

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

describe("API Phase 11", { timeout: 60_000 }, () => {
  it("GET /api/v1/health still reports process health only", async () => {
    const app = await buildApp({ hardening: { enableRateLimit: false } });
    const response = await app.inject({ method: "GET", url: "/api/v1/health" });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { status: string; service: string; version: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBe(SOLANAGUARD_NAME);
    expect(body.version).toBe(SOLANAGUARD_VERSION);
    await app.close();
  });

  it("GET /api/v1/version reports Phase 20 docs without calling it a safety verdict", async () => {
    const app = await buildApp({ hardening: { enableRateLimit: false } });
    const response = await app.inject({ method: "GET", url: "/api/v1/version" });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { phase: number; note: string };
    expect(body.phase).toBe(20);
    expect(body.note).toMatch(/not a safety verdict/i);
    expect(body.note).toMatch(/doc/i);
    await app.close();
  });

  it("serves OpenAPI JSON and documentation UI", async () => {
    const app = await buildApp();
    const openapi = await app.inject({ method: "GET", url: "/api/v1/openapi.json" });
    expect(openapi.statusCode).toBe(200);
    const document = openapi.json() as {
      openapi: string;
      paths: Record<string, unknown>;
      info: { title: string };
    };
    expect(document.openapi).toMatch(/^3\./);
    expect(document.info.title).toMatch(/SolanaGuard/i);
    expect(document.paths["/api/v1/analyze/transaction"]).toBeDefined();
    expect(document.paths["/api/v1/simulate/transaction"]).toBeDefined();
    expect(document.paths["/api/v1/program/{programId}"]).toBeDefined();

    const docs = await app.inject({ method: "GET", url: "/documentation" });
    expect(docs.statusCode).toBe(200);
    expect(docs.body).toMatch(/swagger|openapi/i);
    await app.close();
  });

  it("GET /api/v1/rpc/status uses the injected RPC client", async () => {
    const app = await buildApp({ rpc: mockRpc() });
    const response = await app.inject({ method: "GET", url: "/api/v1/rpc/status" });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { reachable: boolean; slot: number; endpoint: string };
    expect(body.reachable).toBe(true);
    expect(body.slot).toBe(42);
    expect(body.endpoint).toBe("https://api.devnet.solana.com");
    await app.close();
  });

  it("GET /api/v1/account/:address returns 400 for invalid keys", async () => {
    const app = await buildApp({ rpc: mockRpc() });
    const response = await app.inject({ method: "GET", url: "/api/v1/account/not-a-key" });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("GET /api/v1/account/:address returns 404 when the cluster has no account", async () => {
    const app = await buildApp({ rpc: mockRpc() });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/account/11111111111111111111111111111111",
    });
    expect(response.statusCode).toBe(404);
    const body = response.json() as { found: boolean };
    expect(body.found).toBe(false);
    await app.close();
  });

  it("GET /api/v1/program/:programId returns executable metadata without a verdict", async () => {
    const app = await buildApp({
      rpc: mockRpc({
        getAccount: vi.fn(async () => ({
          address: "11111111111111111111111111111111",
          lamports: 1n,
          owner: "NativeLoader1111111111111111111111111111111",
          executable: true,
          rentEpoch: 0n,
          dataLength: 0,
          dataBase64: "",
        })),
      }),
    });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/program/11111111111111111111111111111111",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      found: boolean;
      executable: boolean;
      note: string;
    };
    expect(body.found).toBe(true);
    expect(body.executable).toBe(true);
    expect(body.note).toMatch(/not a safety verdict/i);
    expect(JSON.stringify(body)).not.toMatch(/malicious/i);
    await app.close();
  });

  it("POST /api/v1/transactions/normalize rejects empty bodies", async () => {
    const app = await buildApp({ rpc: mockRpc() });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/transactions/normalize",
      payload: {},
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("POST /api/v1/transactions/normalize returns structure for a transfer", async () => {
    const app = await buildApp({ rpc: mockRpc() });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/transactions/normalize",
      payload: { base64: TRANSFER_BASE64 },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      transaction: {
        instructions: { decoded: boolean; instructionType: string | null }[];
        source: string;
        accountResolution: { attempted: boolean };
        curveClassification: { signerOffCurve: number };
      };
    };
    expect(body.transaction.source).toBe("base64");
    expect(body.transaction.instructions[0]?.decoded).toBe(true);
    expect(body.transaction.instructions[0]?.instructionType).toBe("Transfer");
    expect(body.transaction.accountResolution.attempted).toBe(true);
    expect(body.transaction.curveClassification.signerOffCurve).toBe(0);
    await app.close();
  });

  it("POST /api/v1/transactions/evaluate-rules returns findings without a score", async () => {
    const app = await buildApp({ rpc: mockRpc() });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/transactions/evaluate-rules",
      payload: { base64: TRANSFER_BASE64 },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      evaluation: { findings: unknown[]; note: string; rulesEvaluated: number };
    };
    expect(body.evaluation.rulesEvaluated).toBeGreaterThan(0);
    expect(body.evaluation.note).toMatch(/not a risk score/i);
    expect(body.evaluation).not.toHaveProperty("score");
    expect(JSON.stringify(body.evaluation)).not.toMatch(/malicious/i);
    await app.close();
  });

  it("POST /api/v1/transactions/score returns a transparent breakdown", async () => {
    const app = await buildApp({ rpc: mockRpc() });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/transactions/score",
      payload: { base64: TRANSFER_BASE64 },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      evaluation: { findings: unknown[]; note: string };
      score: {
        total: number;
        band: string;
        contributions: unknown[];
        note: string;
        weights: Record<string, number>;
      };
    };
    expect(body.score.total).toBeGreaterThanOrEqual(0);
    expect(body.score.band).toMatch(/no_findings|informational|elevated|requires_review/);
    expect(body.score.note).toMatch(/not a proof of safety/i);
    expect(body.score.weights).toMatchObject({
      info: 5,
      unusual: 20,
      needs_review: 35,
    });
    expect(JSON.stringify(body)).not.toMatch(/malicious/i);
    expect(body.evaluation).toBeDefined();
    await app.close();
  });

  it("POST /api/v1/transactions/simulate returns a preview, not a verdict", async () => {
    const app = await buildApp({ rpc: mockRpc() });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/transactions/simulate",
      payload: { base64: TRANSFER_BASE64 },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      transaction: { source: string };
      simulation: {
        note: string;
        success: boolean;
        sigVerify: boolean;
        replaceRecentBlockhash: boolean;
      };
    };
    expect(body.transaction.source).toBe("base64");
    expect(body.simulation.sigVerify).toBe(false);
    expect(body.simulation.replaceRecentBlockhash).toBe(true);
    expect(body.simulation.note).toMatch(/not a safety verdict/i);
    expect(JSON.stringify(body.simulation)).not.toMatch(/malicious/i);
    await app.close();
  });

  it("POST /api/v1/simulate/transaction aliases the Phase 9 simulate path", async () => {
    const app = await buildApp({ rpc: mockRpc() });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/simulate/transaction",
      payload: { base64: TRANSFER_BASE64 },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { simulation: { note: string } };
    expect(body.simulation.note).toMatch(/not a safety verdict/i);
    await app.close();
  });

  it("POST /api/v1/transactions/compare returns observations, not a verdict", async () => {
    const app = await buildApp({ rpc: mockRpc() });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/transactions/compare",
      payload: { base64: TRANSFER_BASE64 },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      transaction: { source: string };
      simulation: { note: string };
      comparison: {
        note: string;
        expectedEffects: unknown[];
        observations: { status: string }[];
        summary: {
          matched: number;
          diverged: number;
          incomplete: number;
          notApplicable: number;
        };
      };
    };
    expect(body.transaction.source).toBe("base64");
    expect(body.comparison.expectedEffects.length).toBeGreaterThan(0);
    expect(body.comparison.observations.length).toBeGreaterThan(0);
    expect(body.comparison.note).toMatch(/not a safety verdict/i);
    expect(JSON.stringify(body.comparison)).not.toMatch(/malicious/i);
    expect(body.comparison.summary).toMatchObject({
      matched: expect.any(Number),
      diverged: expect.any(Number),
      incomplete: expect.any(Number),
      notApplicable: expect.any(Number),
    });
    await app.close();
  });

  it("POST /api/v1/analyze/transaction returns the composed report", async () => {
    const app = await buildApp({ rpc: mockRpc() });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/analyze/transaction",
      payload: { base64: TRANSFER_BASE64 },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      transaction: { source: string };
      evaluation: { rulesEvaluated: number; note: string };
      score: { total: number; note: string; band: string };
      simulation: { note: string } | null;
      comparison: { note: string; observations: unknown[] } | null;
      note: string;
    };
    expect(body.transaction.source).toBe("base64");
    expect(body.evaluation.rulesEvaluated).toBeGreaterThan(0);
    expect(body.score.total).toBeGreaterThanOrEqual(0);
    expect(body.simulation?.note).toMatch(/not a safety verdict/i);
    expect(body.comparison?.observations.length).toBeGreaterThan(0);
    expect(body.note).toMatch(/not a safety verdict/i);
    expect(JSON.stringify(body)).not.toMatch(/malicious/i);
    await app.close();
  });

  it("POST /api/v1/analyze/transaction can skip simulation", async () => {
    const simulate = vi.fn(async () => stubNormalizedSimulation());
    const app = await buildApp({
      rpc: mockRpc({ simulateTransactionBytes: simulate }),
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/analyze/transaction",
      payload: { base64: TRANSFER_BASE64, includeSimulation: false },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      simulation: unknown;
      comparison: unknown;
      score: { total: number };
    };
    expect(body.simulation).toBeNull();
    expect(body.comparison).toBeNull();
    expect(body.score.total).toBeGreaterThanOrEqual(0);
    expect(simulate).not.toHaveBeenCalled();
    await app.close();
  });

  it("POST /api/v1/analyze/transaction works without RPC for base64", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/analyze/transaction",
      payload: { base64: TRANSFER_BASE64 },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      simulation: unknown;
      comparison: unknown;
      score: { note: string };
    };
    expect(body.simulation).toBeNull();
    expect(body.comparison).toBeNull();
    expect(body.score.note).toMatch(/not a proof of safety/i);
    await app.close();
  });

  it("listens on a real TCP port and serves health", async () => {
    const app = await buildApp({ hardening: { enableRateLimit: false } });
    const address = await app.listen({ host: "127.0.0.1", port: 0 });
    const response = await fetch(`${address}/api/v1/health`);
    expect(response.ok).toBe(true);
    await app.close();
  });

  it("rejects private-key fields on analyze requests", async () => {
    const app = await buildApp({ hardening: { enableRateLimit: false } });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/analyze/transaction",
      payload: { base64: TRANSFER_BASE64, privateKey: "never-send-this" },
    });
    expect(response.statusCode).toBe(400);
    const body = response.json() as { error: string; message: string };
    expect(body.error).toBe("forbidden_field");
    expect(body.message).toMatch(/private keys|seed phrases/i);
    await app.close();
  });

  it("rejects oversized base64 before analysis", async () => {
    const app = await buildApp({ hardening: { enableRateLimit: false } });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/analyze/transaction",
      payload: { base64: "A".repeat(3000) },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    const app = await buildApp({
      hardening: {
        rateLimitMax: 2,
        rateLimitTimeWindowMs: 60_000,
      },
    });
    const first = await app.inject({ method: "GET", url: "/api/v1/rpc/status" });
    const second = await app.inject({ method: "GET", url: "/api/v1/rpc/status" });
    const third = await app.inject({ method: "GET", url: "/api/v1/rpc/status" });
    // rpc/status returns 503 without RPC; still counts toward the limit.
    expect([first.statusCode, second.statusCode]).toContain(503);
    expect(third.statusCode).toBe(429);
    const body = third.json() as { error: string };
    expect(body.error).toBe("rate_limited");
    await app.close();
  });
});
