import { describe, expect, it, vi } from "vitest";
import { SolanaRpc, stubNormalizedSimulation, type SolanaRpcAdapter } from "@solanaguard/solana";
import { analyzeTransaction, TRANSACTION_ANALYSIS_NOTE } from "./analyze.js";

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

describe("analyzeTransaction", () => {
  it("includes simulation and comparison when RPC is provided", async () => {
    const report = await analyzeTransaction(
      { source: "base64", base64: TRANSFER_BASE64 },
      { rpc: mockRpc() },
    );
    expect(report.note).toBe(TRANSACTION_ANALYSIS_NOTE);
    expect(report.evaluation.rulesEvaluated).toBeGreaterThan(0);
    expect(report.score.total).toBeGreaterThanOrEqual(0);
    expect(report.simulation).not.toBeNull();
    expect(report.comparison).not.toBeNull();
    expect(report.comparison?.observations.length).toBeGreaterThan(0);
    expect(JSON.stringify(report)).not.toMatch(/malicious/i);
  });

  it("omits simulation when includeSimulation is false", async () => {
    const simulate = vi.fn(async () => stubNormalizedSimulation());
    const report = await analyzeTransaction(
      { source: "base64", base64: TRANSFER_BASE64 },
      { rpc: mockRpc({ simulateTransactionBytes: simulate }), includeSimulation: false },
    );
    expect(report.simulation).toBeNull();
    expect(report.comparison).toBeNull();
    expect(simulate).not.toHaveBeenCalled();
  });
});
