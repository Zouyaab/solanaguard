import { describe, expect, it, vi } from "vitest";
import {
  AddressLookupTableAccount,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { InvalidTransactionError, SolanaRpc, stubNormalizedSimulation, type SolanaRpcAdapter } from "@solanaguard/solana";
import { MAX_SOLANA_TRANSACTION_BYTES } from "@solanaguard/types";
import { TransactionNotFoundError } from "./errors.js";
import {
  LOOKUPS_UNRESOLVED_NOTE,
  normalizeLocalTransaction,
  normalizeTransaction,
} from "./normalize.js";

const BLOCKHASH = "11111111111111111111111111111111";
const SYSTEM = SystemProgram.programId.toBase58();

function signedTransfer(): {
  payer: Keypair;
  to: Keypair;
  transaction: VersionedTransaction;
} {
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
  return { payer, to, transaction };
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

describe("normalizeLocalTransaction", () => {
  it("produces the same structure from bytes, base64, and VersionedTransaction", () => {
    const { payer, to, transaction } = signedTransfer();
    const bytes = transaction.serialize();
    const fromObject = normalizeLocalTransaction({ source: "versioned", transaction });
    const fromBytes = normalizeLocalTransaction(bytes);
    const fromBase64 = normalizeLocalTransaction({
      source: "base64",
      base64: Buffer.from(bytes).toString("base64"),
    });

    expect(fromObject.version).toBe(0);
    expect(fromObject.feePayer).toBe(payer.publicKey.toBase58());
    expect(fromObject.signed).toBe(true);
    expect(fromObject.lookupsUnresolved).toBe(false);
    expect(fromObject.instructions).toHaveLength(1);
    expect(fromObject.instructions[0]?.decoded).toBe(true);
    expect(fromObject.instructions[0]?.decodeStatus).toBe("decoded");
    expect(fromObject.instructions[0]?.programId).toBe(SYSTEM);
    expect(fromObject.instructions[0]?.programName).toBe("system_program");
    expect(fromObject.instructions[0]?.instructionType).toBe("Transfer");
    expect(fromObject.instructions[0]?.args.lamports).toBe("1000");
    expect(fromObject.accountKeys.map((key) => key.address)).toEqual(
      expect.arrayContaining([payer.publicKey.toBase58(), to.publicKey.toBase58(), SYSTEM]),
    );
    expect(fromObject.notes[0]).toMatch(/1 of 1 instruction\(s\) decoded/);
    expect(fromObject.notes.some((note) => note.includes("not a risk assessment"))).toBe(true);
    expect(fromObject.notes.some((note) => note.includes("not evidence of malice"))).toBe(true);
    expect(fromObject.curveClassification.signerOffCurve).toBe(0);
    expect(
      fromObject.accountKeys.find((key) => key.address === payer.publicKey.toBase58())?.onCurve,
    ).toBe(true);

    expect(fromBytes.accountKeys).toEqual(fromObject.accountKeys);
    expect(fromBytes.instructions).toEqual(fromObject.instructions);
    expect(fromBase64.source).toBe("base64");
    expect(fromBytes.source).toBe("bytes");
    expect(fromObject.source).toBe("versioned");
  });

  it("normalizes a legacy Transaction", () => {
    const payer = Keypair.generate();
    const to = Keypair.generate();
    const legacy = new Transaction({
      feePayer: payer.publicKey,
      recentBlockhash: BLOCKHASH,
    }).add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: to.publicKey,
        lamports: 500,
      }),
    );
    legacy.sign(payer);
    const normalized = normalizeLocalTransaction({ source: "legacy", transaction: legacy });
    expect(normalized.source).toBe("legacy");
    expect(normalized.feePayer).toBe(payer.publicKey.toBase58());
    expect(normalized.instructions[0]?.decoded).toBe(true);
    expect(normalized.instructions[0]?.instructionType).toBe("Transfer");
    expect(normalized.instructions[0]?.programId).toBe(SYSTEM);
  });

  it("marks lookup tables unresolved when loaded addresses are absent", () => {
    const payer = Keypair.generate();
    const dest = Keypair.generate();
    const lookup = new AddressLookupTableAccount({
      key: Keypair.generate().publicKey,
      state: {
        deactivationSlot: BigInt("0xffffffffffffffff"),
        lastExtendedSlot: 0,
        lastExtendedSlotStartIndex: 0,
        authority: payer.publicKey,
        addresses: [dest.publicKey],
      },
    });
    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: dest.publicKey,
          lamports: 1,
        }),
      ],
    }).compileToV0Message([lookup]);
    const transaction = new VersionedTransaction(message);
    const normalized = normalizeLocalTransaction({ source: "versioned", transaction });
    expect(normalized.addressTableLookups.length).toBeGreaterThan(0);
    expect(normalized.lookupsUnresolved).toBe(true);
    expect(normalized.notes).toContain(LOOKUPS_UNRESOLVED_NOTE);
  });

  it("rejects empty and oversized bytes", () => {
    expect(() => normalizeLocalTransaction(new Uint8Array())).toThrow(InvalidTransactionError);
    expect(() =>
      normalizeLocalTransaction(new Uint8Array(MAX_SOLANA_TRANSACTION_BYTES + 1)),
    ).toThrow(InvalidTransactionError);
    expect(() => normalizeLocalTransaction(Uint8Array.from([1, 2, 3, 4]))).toThrow(
      InvalidTransactionError,
    );
  });
});

describe("normalizeTransaction (signature)", () => {
  it("requires RPC and maps a missing signature to TransactionNotFoundError", async () => {
    await expect(
      normalizeTransaction({ source: "signature", signature: "1".repeat(64) }),
    ).rejects.toBeInstanceOf(InvalidTransactionError);

    const rpc = mockRpc();
    await expect(
      normalizeTransaction({ source: "signature", signature: "1".repeat(64) }, { rpc }),
    ).rejects.toBeInstanceOf(TransactionNotFoundError);
  });

  it("normalizes wire bytes returned by RPC and attaches confirmation", async () => {
    const { transaction } = signedTransfer();
    const bytes = transaction.serialize();
    const rpc = mockRpc({
      getTransactionWire: vi.fn(async () => ({
        bytes,
        signature: "1".repeat(64),
        slot: 99,
        blockTime: 1_700_000_000,
        err: null,
        feeLamports: 5000,
        loadedAddresses: null,
      })),
    });
    const normalized = await normalizeTransaction(
      { source: "signature", signature: "1".repeat(64) },
      { rpc },
    );
    expect(normalized.source).toBe("signature");
    expect(normalized.confirmation?.slot).toBe(99);
    expect(normalized.confirmation?.feeLamports).toBe(5000);
    expect(normalized.instructions[0]?.decoded).toBe(true);
    expect(normalized.instructions[0]?.instructionType).toBe("Transfer");
    expect(normalized.accountResolution.attempted).toBe(true);
    expect(normalized.resolvedAccounts.length).toBeGreaterThan(0);
  });
});
