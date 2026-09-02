import { describe, expect, it, vi } from "vitest";
import { SolanaRpc, GET_MULTIPLE_ACCOUNTS_LIMIT } from "./client.js";
import { InvalidAddressError, InvalidTransactionError } from "./errors.js";
import type { NormalizedAccount, SolanaRpcAdapter } from "./types.js";
import { stubNormalizedSimulation } from "./types.js";

function account(address: string): NormalizedAccount {
  return {
    address,
    lamports: 1n,
    owner: "11111111111111111111111111111111",
    executable: false,
    rentEpoch: 0n,
    dataLength: 0,
    dataBase64: "",
  };
}

function mockAdapter(overrides: Partial<SolanaRpcAdapter> = {}): SolanaRpcAdapter {
  return {
    getHealth: vi.fn(async () => "ok"),
    getSlot: vi.fn(async () => 123),
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
}

const SYSTEM = "11111111111111111111111111111111";

describe("SolanaRpc", () => {
  it("rejects invalid addresses before calling the adapter", async () => {
    const adapter = mockAdapter();
    const rpc = new SolanaRpc(adapter, "https://api.devnet.solana.com");
    await expect(rpc.getAccount("nope")).rejects.toBeInstanceOf(InvalidAddressError);
    expect(adapter.getAccount).not.toHaveBeenCalled();
  });

  it("chunks getMultipleAccounts at the RPC limit", async () => {
    const adapter = mockAdapter({
      getMultipleAccounts: vi.fn(async (addresses: string[]) =>
        addresses.map((address) => account(address)),
      ),
    });
    const rpc = new SolanaRpc(adapter, "https://api.devnet.solana.com");
    const keys = Array.from({ length: GET_MULTIPLE_ACCOUNTS_LIMIT + 2 }, () => SYSTEM);
    const result = await rpc.getMultipleAccounts(keys);
    expect(result).toHaveLength(GET_MULTIPLE_ACCOUNTS_LIMIT + 2);
    expect(adapter.getMultipleAccounts).toHaveBeenCalledTimes(2);
    expect(vi.mocked(adapter.getMultipleAccounts).mock.calls[0]?.[0]).toHaveLength(
      GET_MULTIPLE_ACCOUNTS_LIMIT,
    );
    expect(vi.mocked(adapter.getMultipleAccounts).mock.calls[1]?.[0]).toHaveLength(2);
  });

  it("rejects a short transaction signature", async () => {
    const adapter = mockAdapter();
    const rpc = new SolanaRpc(adapter, "https://api.devnet.solana.com");
    await expect(rpc.getTransaction("abc")).rejects.toBeInstanceOf(InvalidTransactionError);
    await expect(rpc.getTransactionWire("abc")).rejects.toBeInstanceOf(InvalidTransactionError);
    expect(adapter.getTransaction).not.toHaveBeenCalled();
    expect(adapter.getTransactionWire).not.toHaveBeenCalled();
  });

  it("reports reachable false when health fails, without throwing", async () => {
    const adapter = mockAdapter({
      getHealth: vi.fn(async () => {
        throw new Error("fetch failed");
      }),
    });
    const rpc = new SolanaRpc(adapter, "https://secret.example/?api-key=super-secret");
    const status = await rpc.getStatus();
    expect(status.reachable).toBe(false);
    expect(status.error).toMatch(/fetch failed/);
    expect(status.endpoint).toBe("https://secret.example");
    expect(status.endpoint).not.toContain("super-secret");
  });

  it("rejects empty simulation bytes", async () => {
    const rpc = new SolanaRpc(mockAdapter(), "https://api.devnet.solana.com");
    await expect(rpc.simulateTransaction(new Uint8Array())).rejects.toBeInstanceOf(
      InvalidTransactionError,
    );
  });

  it("forwards optional account keys to the adapter", async () => {
    const adapter = mockAdapter();
    const rpc = new SolanaRpc(adapter, "https://api.devnet.solana.com");
    await rpc.simulateTransaction(new Uint8Array([1, 2, 3]), {
      accounts: ["11111111111111111111111111111111"],
    });
    expect(adapter.simulateTransactionBytes).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), {
      accounts: ["11111111111111111111111111111111"],
    });
  });
});
