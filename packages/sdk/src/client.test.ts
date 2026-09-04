import { describe, expect, it, vi } from "vitest";
import {
  SolanaGuardApiError,
  SolanaGuardClient,
  SolanaGuardNotFoundError,
  SolanaGuardRequestError,
  analyzeTransaction,
  toTransactionRequest,
} from "./index.js";

const TRANSFER_BASE64 =
  "Aecq9mMF4htQuahqnrKRXHzGPmtuxSNj3PCHqwV+aESk4I3P/1AGM7tneIzgF4eNbTZwmDDTGz4rED2UfyWGtgKAAQABAwafd7Wj1Am+2iNI3JDf0BDwxjcevjSU6u+w7PElwShXB8c/1UTJwIVBcsnyguiJJXGSUgVkHRojpkD+x44QnbIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQICAAEMAgAAAAEAAAAAAAAAAA==";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("toTransactionRequest", () => {
  it("accepts base64, signature, bytes, and bare strings", () => {
    expect(toTransactionRequest(TRANSFER_BASE64)).toEqual({ base64: TRANSFER_BASE64 });
    expect(toTransactionRequest({ signature: "sig" })).toEqual({ signature: "sig" });
    expect(toTransactionRequest({ base64: TRANSFER_BASE64, includeSimulation: false })).toEqual({
      base64: TRANSFER_BASE64,
      includeSimulation: false,
    });
    const bytes = Uint8Array.from([1, 2, 3]);
    expect(toTransactionRequest(bytes)).toEqual({
      base64: Buffer.from(bytes).toString("base64"),
    });
  });

  it("rejects empty inputs", () => {
    expect(() => toTransactionRequest("")).toThrow(SolanaGuardRequestError);
    expect(() => toTransactionRequest(new Uint8Array())).toThrow(SolanaGuardRequestError);
  });
});

describe("SolanaGuardClient", () => {
  it("calls analyze and returns the typed report", async () => {
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe("http://127.0.0.1:3001/api/v1/analyze/transaction");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual({
        base64: TRANSFER_BASE64,
        includeSimulation: false,
      });
      return jsonResponse(200, {
        transaction: { source: "base64" },
        evaluation: { findings: [], rulesEvaluated: 1, rulesFired: 0, note: "not a risk score" },
        score: {
          total: 0,
          cap: 100,
          band: "no_findings",
          contributions: [],
          weights: { info: 5, unusual: 20, needs_review: 35 },
          note: "not a proof of safety",
        },
        simulation: null,
        comparison: null,
        note: "not a safety verdict",
      });
    });

    const client = new SolanaGuardClient({
      baseUrl: "http://127.0.0.1:3001/",
      fetch: fetchImpl as unknown as typeof fetch,
    });
    const report = await client.analyzeTransaction({
      base64: TRANSFER_BASE64,
      includeSimulation: false,
    });
    expect(report.score.total).toBe(0);
    expect(report.note).toMatch(/not a safety verdict/i);
    expect(JSON.stringify(report)).not.toMatch(/malicious/i);
  });

  it("maps 404 to SolanaGuardNotFoundError", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(404, {
        found: false,
        address: "11111111111111111111111111111111",
        message: "No account exists at this address on the configured cluster.",
      }),
    );
    const client = new SolanaGuardClient({
      baseUrl: "http://127.0.0.1:3001",
      fetch: fetchImpl as unknown as typeof fetch,
    });
    await expect(client.getAccount("11111111111111111111111111111111")).rejects.toBeInstanceOf(
      SolanaGuardNotFoundError,
    );
  });

  it("maps non-404 failures to SolanaGuardApiError", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(400, { error: "invalid_request", message: "bad body" }),
    );
    const client = new SolanaGuardClient({
      baseUrl: "http://127.0.0.1:3001",
      fetch: fetchImpl as unknown as typeof fetch,
    });
    await expect(client.normalizeTransaction({ base64: "x" })).rejects.toMatchObject({
      name: "SolanaGuardApiError",
      status: 400,
    } satisfies Partial<SolanaGuardApiError>);
  });

  it("hits health and simulate paths", async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const href = String(url);
      if (href.endsWith("/api/v1/health")) {
        return jsonResponse(200, {
          status: "ok",
          service: "SolanaGuard",
          version: "0.1.0",
          time: "2026-01-01T00:00:00.000Z",
        });
      }
      if (href.endsWith("/api/v1/simulate/transaction")) {
        return jsonResponse(200, {
          transaction: { source: "base64" },
          simulation: { success: true, note: "not a safety verdict" },
        });
      }
      throw new Error(`unexpected ${href}`);
    });
    const client = new SolanaGuardClient({
      baseUrl: "http://127.0.0.1:3001",
      fetch: fetchImpl as unknown as typeof fetch,
    });
    const health = await client.health();
    expect(health.status).toBe("ok");
    const simulated = await client.simulateTransaction(TRANSFER_BASE64);
    expect(simulated.simulation.note).toMatch(/not a safety verdict/i);
  });

  it("analyzeTransaction helper constructs a client", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        transaction: { source: "base64" },
        evaluation: { findings: [], rulesEvaluated: 1, rulesFired: 0, note: "n" },
        score: {
          total: 0,
          cap: 100,
          band: "no_findings",
          contributions: [],
          weights: { info: 5, unusual: 20, needs_review: 35 },
          note: "not a proof of safety",
        },
        simulation: null,
        comparison: null,
        note: "not a safety verdict",
      }),
    );
    const report = await analyzeTransaction(TRANSFER_BASE64, {
      baseUrl: "http://127.0.0.1:3001",
      fetch: fetchImpl as unknown as typeof fetch,
    });
    expect(report.score.band).toBe("no_findings");
  });
});
