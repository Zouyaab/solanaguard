import { describe, expect, it, vi } from "vitest";
import {
  AddressLookupTableAccount,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { SolanaRpc, stubNormalizedSimulation, type NormalizedAccount, type SolanaRpcAdapter } from "@solanaguard/solana";
import {
  LOOKUPS_UNRESOLVED_NOTE,
  normalizeLocalTransaction,
  normalizeTransaction,
} from "./normalize.js";
import {
  ACCOUNT_RESOLUTION_SKIPPED_NOTE,
  LOOKUP_TABLES_UNREADABLE_NOTE,
  resolveLookupAddresses,
} from "./resolve.js";

const BLOCKHASH = "11111111111111111111111111111111";
const SYSTEM = SystemProgram.programId.toBase58();

function foundAccount(
  address: string,
  overrides: Partial<NormalizedAccount> = {},
): NormalizedAccount {
  return {
    address,
    lamports: 1_000_000n,
    owner: SYSTEM,
    executable: address === SYSTEM,
    rentEpoch: 0n,
    dataLength: 0,
    dataBase64: "",
    ...overrides,
  };
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

function serializeLookupTable(authority: PublicKey, addresses: PublicKey[]): Buffer {
  const meta = Buffer.alloc(56);
  meta.writeUInt32LE(1, 0);
  meta.writeBigUInt64LE(0xffffffffffffffffn, 4);
  meta.writeBigUInt64LE(0n, 12);
  meta.writeUInt8(0, 20);
  meta.writeUInt8(1, 21);
  Buffer.from(authority.toBytes()).copy(meta, 22);
  return Buffer.concat([meta, ...addresses.map((address) => Buffer.from(address.toBytes()))]);
}

describe("account resolution", () => {
  it("skips cluster fetches when normalizeTransaction has no RPC client", async () => {
    const payer = Keypair.generate();
    const to = Keypair.generate();
    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: to.publicKey,
          lamports: 1,
        }),
      ],
    }).compileToV0Message();
    const normalized = await normalizeTransaction({
      source: "versioned",
      transaction: new VersionedTransaction(message),
    });
    expect(normalized.accountResolution.attempted).toBe(false);
    expect(normalized.resolvedAccounts).toEqual([]);
    expect(normalized.notes).toContain(ACCOUNT_RESOLUTION_SKIPPED_NOTE);
  });

  it("records found and not_found snapshots without calling that a risk finding", async () => {
    const payer = Keypair.generate();
    const to = Keypair.generate();
    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: to.publicKey,
          lamports: 1,
        }),
      ],
    }).compileToV0Message();
    const transaction = new VersionedTransaction(message);
    const rpc = mockRpc({
      getMultipleAccounts: vi.fn(async (addresses: string[]) =>
        addresses.map((address) => (address === SYSTEM ? foundAccount(address) : null)),
      ),
    });
    const normalized = await normalizeTransaction({ source: "versioned", transaction }, { rpc });
    expect(normalized.accountResolution.attempted).toBe(true);
    expect(
      normalized.resolvedAccounts.some(
        (item) => item.address === SYSTEM && item.presence === "found",
      ),
    ).toBe(true);
    expect(
      normalized.resolvedAccounts.some(
        (item) => item.address === payer.publicKey.toBase58() && item.presence === "not_found",
      ),
    ).toBe(true);
    expect(normalized.notes.some((note) => note.includes("not a risk finding"))).toBe(true);
    expect(normalized.notes.some((note) => /malicious|safe to sign/i.test(note))).toBe(false);
  });

  it("loads address lookup tables from RPC account data", async () => {
    const payer = Keypair.generate();
    const dest = Keypair.generate();
    const tableKey = Keypair.generate();
    const lookup = new AddressLookupTableAccount({
      key: tableKey.publicKey,
      state: {
        deactivationSlot: BigInt("0xffffffffffffffff"),
        lastExtendedSlot: 0,
        lastExtendedSlotStartIndex: 0,
        authority: payer.publicKey,
        addresses: [dest.publicKey],
      },
    });
    const data = serializeLookupTable(payer.publicKey, [dest.publicKey]);
    expect(AddressLookupTableAccount.deserialize(data).addresses[0]?.equals(dest.publicKey)).toBe(
      true,
    );

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
    const local = normalizeLocalTransaction({ source: "versioned", transaction });
    expect(local.lookupsUnresolved).toBe(true);
    expect(local.notes).toContain(LOOKUPS_UNRESOLVED_NOTE);

    const rpc = mockRpc({
      getMultipleAccounts: vi.fn(async (addresses: string[]) =>
        addresses.map((address) => {
          if (address === tableKey.publicKey.toBase58()) {
            return foundAccount(address, {
              dataLength: data.length,
              dataBase64: data.toString("base64"),
            });
          }
          return foundAccount(address);
        }),
      ),
    });
    const normalized = await normalizeTransaction({ source: "versioned", transaction }, { rpc });
    expect(normalized.lookupsUnresolved).toBe(false);
    expect(normalized.notes).not.toContain(LOOKUPS_UNRESOLVED_NOTE);
    expect(normalized.accountKeys.some((key) => key.address === dest.publicKey.toBase58())).toBe(
      true,
    );
    expect(normalized.instructions[0]?.decoded).toBe(true);
  });

  it("leaves lookups unresolved when the table account is missing", async () => {
    const table = Keypair.generate().publicKey.toBase58();
    const result = await resolveLookupAddresses(mockRpc(), [
      {
        accountKey: table,
        writableIndexes: [0],
        readonlyIndexes: [],
      },
    ]);
    expect(result.loadedAddresses).toBeNull();
    expect(result.notes).toContain(LOOKUP_TABLES_UNREADABLE_NOTE);
  });
});
