import { describe, expect, it, vi } from "vitest";
import {
  Keypair,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  InvalidTransactionError,
  SolanaRpc,
  stubNormalizedSimulation,
  type SolanaRpcAdapter,
} from "@solanaguard/solana";
import { SIMULATION_NOTE, simulateNormalizedTransaction } from "./simulate.js";
import { TransactionNotFoundError } from "./errors.js";

const BLOCKHASH = "11111111111111111111111111111111";

function signedTransfer(): VersionedTransaction {
  const payer = Keypair.generate();
  const to = Keypair.generate();
  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: BLOCKHASH,
    instructions: [
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: to.publicKey,
        lamports: 1000,
      }),
    ],
  }).compileToV0Message();
  const transaction = new VersionedTransaction(message);
  transaction.sign([payer]);
  return transaction;
}

function mockRpc(overrides: Partial<SolanaRpcAdapter> = {}): SolanaRpc {
  const adapter: SolanaRpcAdapter = {
    getHealth: vi.fn(async () => "ok"),
    getSlot: vi.fn(async () => 1),
    getLatestBlockhash: vi.fn(async () => ({
      blockhash: BLOCKHASH,
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

describe("simulateNormalizedTransaction", () => {
  it("requests unique account keys and maps a JSON-safe report", async () => {
    const transaction = signedTransfer();
    const adapterSimulate = vi.fn(async (_bytes: Uint8Array, options?: { accounts?: readonly string[] }) =>
      stubNormalizedSimulation({
        success: true,
        error: null,
        logs: ["Program 11111111111111111111111111111111 success"],
        unitsConsumed: 150,
        contextSlot: 77,
        accountsRequested: [...(options?.accounts ?? [])],
        accountsReturned: true,
        accounts: (options?.accounts ?? []).map((address) => ({
          address,
          returned: true,
          lamports: 1,
          owner: SystemProgram.programId.toBase58(),
          executable: false,
          dataLength: 0,
          dataBase64: "",
        })),
      }),
    );
    const rpc = mockRpc({ simulateTransactionBytes: adapterSimulate });
    const result = await simulateNormalizedTransaction(
      { source: "versioned", transaction },
      { rpc },
    );
    expect(adapterSimulate).toHaveBeenCalledTimes(1);
    const requested = adapterSimulate.mock.calls[0]?.[1]?.accounts ?? [];
    expect(requested.length).toBeGreaterThan(0);
    expect(new Set(requested).size).toBe(requested.length);
    expect(result.simulation.success).toBe(true);
    expect(result.simulation.contextSlot).toBe(77);
    expect(result.simulation.unitsConsumed).toBe(150);
    expect(result.simulation.accounts[0]?.lamports).toBe("1");
    expect(result.simulation.note).toBe(SIMULATION_NOTE);
    expect(result.simulation.note).toMatch(/not a safety verdict/i);
    expect(JSON.stringify(result.simulation)).not.toMatch(/\bmalicious\b/i);
    expect(result.transaction.instructions[0]?.instructionType).toBe("Transfer");
  });

  it("treats a missing confirmed signature as not found, not malice", async () => {
    const rpc = mockRpc();
    await expect(
      simulateNormalizedTransaction(
        { source: "signature", signature: "1".repeat(88) },
        { rpc },
      ),
    ).rejects.toBeInstanceOf(TransactionNotFoundError);
  });

  it("refuses to simulate without RPC", async () => {
    await expect(
      simulateNormalizedTransaction(signedTransfer(), { rpc: undefined as never }),
    ).rejects.toBeInstanceOf(InvalidTransactionError);
  });
});
