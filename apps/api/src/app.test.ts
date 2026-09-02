import { describe, expect, it, vi } from "vitest";
import { SOLANAGUARD_NAME, SOLANAGUARD_VERSION } from "@solanaguard/types";
import { SolanaRpc, stubNormalizedSimulation, type SolanaRpcAdapter } from "@solanaguard/solana";
import { buildApp } from "./app.js";

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

describe("API Phase 7", { timeout: 60_000 }, () => {
  it("GET /api/v1/health still reports process health only", async () => {
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/health" });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { status: string; service: string; version: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBe(SOLANAGUARD_NAME);
    expect(body.version).toBe(SOLANAGUARD_VERSION);
    await app.close();
  });

  it("GET /api/v1/version reports Phase 10 comparison without calling it a safety verdict", async () => {
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/version" });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { phase: number; note: string };
    expect(body.phase).toBe(10);
    expect(body.note).toMatch(/not a safety verdict/i);
    expect(body.note).toMatch(/compar/i);
    await app.close();
  });

  it("GET /api/v1/rpc/status uses the injected RPC client", async () => {
    const app = buildApp({ rpc: mockRpc() });
    const response = await app.inject({ method: "GET", url: "/api/v1/rpc/status" });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { reachable: boolean; slot: number; endpoint: string };
    expect(body.reachable).toBe(true);
    expect(body.slot).toBe(42);
    expect(body.endpoint).toBe("https://api.devnet.solana.com");
    await app.close();
  });

  it("GET /api/v1/account/:address returns 400 for invalid keys", async () => {
    const app = buildApp({ rpc: mockRpc() });
    const response = await app.inject({ method: "GET", url: "/api/v1/account/not-a-key" });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("GET /api/v1/account/:address returns 404 when the cluster has no account", async () => {
    const app = buildApp({ rpc: mockRpc() });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/account/11111111111111111111111111111111",
    });
    expect(response.statusCode).toBe(404);
    const body = response.json() as { found: boolean };
    expect(body.found).toBe(false);
    await app.close();
  });

  it("POST /api/v1/transactions/normalize rejects empty bodies", async () => {
    const app = buildApp({ rpc: mockRpc() });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/transactions/normalize",
      payload: {},
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("POST /api/v1/transactions/normalize returns structure for a transfer", async () => {
    const app = buildApp({ rpc: mockRpc() });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/transactions/normalize",
      payload: {
        base64:
          "Aecq9mMF4htQuahqnrKRXHzGPmtuxSNj3PCHqwV+aESk4I3P/1AGM7tneIzgF4eNbTZwmDDTGz4rED2UfyWGtgKAAQABAwafd7Wj1Am+2iNI3JDf0BDwxjcevjSU6u+w7PElwShXB8c/1UTJwIVBcsnyguiJJXGSUgVkHRojpkD+x44QnbIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQICAAEMAgAAAAEAAAAAAAAAAA==",
      },
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
    const app = buildApp({ rpc: mockRpc() });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/transactions/evaluate-rules",
      payload: {
        base64:
          "Aecq9mMF4htQuahqnrKRXHzGPmtuxSNj3PCHqwV+aESk4I3P/1AGM7tneIzgF4eNbTZwmDDTGz4rED2UfyWGtgKAAQABAwafd7Wj1Am+2iNI3JDf0BDwxjcevjSU6u+w7PElwShXB8c/1UTJwIVBcsnyguiJJXGSUgVkHRojpkD+x44QnbIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQICAAEMAgAAAAEAAAAAAAAAAA==",
      },
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
    const app = buildApp({ rpc: mockRpc() });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/transactions/score",
      payload: {
        base64:
          "Aecq9mMF4htQuahqnrKRXHzGPmtuxSNj3PCHqwV+aESk4I3P/1AGM7tneIzgF4eNbTZwmDDTGz4rED2UfyWGtgKAAQABAwafd7Wj1Am+2iNI3JDf0BDwxjcevjSU6u+w7PElwShXB8c/1UTJwIVBcsnyguiJJXGSUgVkHRojpkD+x44QnbIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQICAAEMAgAAAAEAAAAAAAAAAA==",
      },
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
    const app = buildApp({ rpc: mockRpc() });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/transactions/simulate",
      payload: {
        base64:
          "Aecq9mMF4htQuahqnrKRXHzGPmtuxSNj3PCHqwV+aESk4I3P/1AGM7tneIzgF4eNbTZwmDDTGz4rED2UfyWGtgKAAQABAwafd7Wj1Am+2iNI3JDf0BDwxjcevjSU6u+w7PElwShXB8c/1UTJwIVBcsnyguiJJXGSUgVkHRojpkD+x44QnbIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQICAAEMAgAAAAEAAAAAAAAAAA==",
      },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      transaction: { source: string };
      simulation: { note: string; success: boolean; sigVerify: boolean; replaceRecentBlockhash: boolean };
    };
    expect(body.transaction.source).toBe("base64");
    expect(body.simulation.sigVerify).toBe(false);
    expect(body.simulation.replaceRecentBlockhash).toBe(true);
    expect(body.simulation.note).toMatch(/not a safety verdict/i);
    expect(JSON.stringify(body.simulation)).not.toMatch(/malicious/i);
    await app.close();
  });

  it("POST /api/v1/transactions/compare returns observations, not a verdict", async () => {
    const app = buildApp({ rpc: mockRpc() });
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/transactions/compare",
      payload: {
        base64:
          "Aecq9mMF4htQuahqnrKRXHzGPmtuxSNj3PCHqwV+aESk4I3P/1AGM7tneIzgF4eNbTZwmDDTGz4rED2UfyWGtgKAAQABAwafd7Wj1Am+2iNI3JDf0BDwxjcevjSU6u+w7PElwShXB8c/1UTJwIVBcsnyguiJJXGSUgVkHRojpkD+x44QnbIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQICAAEMAgAAAAEAAAAAAAAAAA==",
      },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      transaction: { source: string };
      simulation: { note: string };
      comparison: {
        note: string;
        expectedEffects: unknown[];
        observations: { status: string }[];
        summary: { matched: number; diverged: number; incomplete: number; notApplicable: number };
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

  it("listens on a real TCP port and serves health", async () => {
    const app = buildApp();
    const address = await app.listen({ host: "127.0.0.1", port: 0 });
    const response = await fetch(`${address}/api/v1/health`);
    expect(response.ok).toBe(true);
    await app.close();
  });
});
