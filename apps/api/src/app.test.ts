import { describe, expect, it, vi } from "vitest";
import { SOLANAGUARD_NAME, SOLANAGUARD_VERSION } from "@solanaguard/types";
import { SolanaRpc, type SolanaRpcAdapter } from "@solanaguard/solana";
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
    simulateTransactionBytes: vi.fn(async () => ({
      available: true as const,
      success: false,
      error: null,
      logs: [],
      unitsConsumed: null,
    })),
    ...overrides,
  };
  return new SolanaRpc(adapter, "https://api.devnet.solana.com");
}

describe("API Phase 6", { timeout: 60_000 }, () => {
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

  it("GET /api/v1/version is honest about missing analysis", async () => {
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/version" });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { phase: number; note: string };
    expect(body.phase).toBe(6);
    expect(body.note).toMatch(/not implemented/i);
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

  it("listens on a real TCP port and serves health", async () => {
    const app = buildApp();
    const address = await app.listen({ host: "127.0.0.1", port: 0 });
    const response = await fetch(`${address}/api/v1/health`);
    expect(response.ok).toBe(true);
    await app.close();
  });
});
