import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { PublicKey, Keypair } from "@solana/web3.js";
import { createConnection, createWeb3JsAdapter } from "./web3js-adapter.js";
import { InvalidTransactionError, RpcRequestError } from "./errors.js";

const SYSTEM = "11111111111111111111111111111111";

function mockConnection(overrides: Record<string, unknown> = {}) {
  return {
    rpcEndpoint: "https://api.devnet.solana.com",
    getSlot: vi.fn(async () => 99),
    getLatestBlockhash: vi.fn(async () => ({
      blockhash: SYSTEM,
      lastValidBlockHeight: 10,
    })),
    getAccountInfo: vi.fn(async () => null),
    getMultipleAccountsInfo: vi.fn(async (keys: PublicKey[]) => keys.map(() => null)),
    getTransaction: vi.fn(async () => null),
    getBalance: vi.fn(async () => 1_000),
    simulateTransaction: vi.fn(async () => ({
      context: { slot: 1 },
      value: {
        err: null,
        logs: ["ok"],
        accounts: null,
        unitsConsumed: 100,
        returnData: null,
        innerInstructions: null,
      },
    })),
    ...overrides,
  };
}

describe("createConnection", () => {
  it("builds a Connection with the given RPC URL", () => {
    const connection = createConnection("https://api.devnet.solana.com", 5_000);
    expect(connection.rpcEndpoint).toContain("api.devnet.solana.com");
  });
});

describe("createWeb3JsAdapter", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn(async () =>
      Response.json({ jsonrpc: "2.0", id: 1, result: "ok" }),
    ) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("getHealth parses a string RPC result", async () => {
    const adapter = createWeb3JsAdapter(mockConnection() as never);
    await expect(adapter.getHealth()).resolves.toBe("ok");
  });

  it("getHealth wraps non-OK HTTP as RpcRequestError", async () => {
    globalThis.fetch = vi.fn(async () => new Response("nope", { status: 500 })) as typeof fetch;
    const adapter = createWeb3JsAdapter(mockConnection() as never);
    await expect(adapter.getHealth()).rejects.toBeInstanceOf(RpcRequestError);
  });

  it("getHealth rejects RPC error bodies", async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json({ jsonrpc: "2.0", id: 1, error: { message: "busy" } }),
    ) as typeof fetch;
    const adapter = createWeb3JsAdapter(mockConnection() as never);
    await expect(adapter.getHealth()).rejects.toBeInstanceOf(RpcRequestError);
  });

  it("getSlot and getLatestBlockhash delegate to Connection", async () => {
    const connection = mockConnection();
    const adapter = createWeb3JsAdapter(connection as never);
    await expect(adapter.getSlot()).resolves.toBe(99);
    await expect(adapter.getLatestBlockhash()).resolves.toEqual({
      blockhash: SYSTEM,
      lastValidBlockHeight: 10,
    });
  });

  it("getAccount maps AccountInfo and returns null when missing", async () => {
    const address = Keypair.generate().publicKey.toBase58();
    const connection = mockConnection({
      getAccountInfo: vi.fn(async () => ({
        lamports: 42,
        owner: new PublicKey(SYSTEM),
        executable: false,
        rentEpoch: 1,
        data: Buffer.from("hi"),
      })),
    });
    const adapter = createWeb3JsAdapter(connection as never);
    const account = await adapter.getAccount(address);
    expect(account?.lamports).toBe(42n);
    expect(account?.dataBase64).toBe(Buffer.from("hi").toString("base64"));
    expect(account?.owner).toBe(SYSTEM);

    connection.getAccountInfo = vi.fn(async () => null);
    await expect(adapter.getAccount(address)).resolves.toBeNull();
  });

  it("getMultipleAccounts preserves order and null holes", async () => {
    const a = Keypair.generate().publicKey.toBase58();
    const b = Keypair.generate().publicKey.toBase58();
    const connection = mockConnection({
      getMultipleAccountsInfo: vi.fn(async () => [
        {
          lamports: 1,
          owner: new PublicKey(SYSTEM),
          executable: false,
          rentEpoch: 0,
          data: Buffer.alloc(0),
        },
        null,
      ]),
    });
    const adapter = createWeb3JsAdapter(connection as never);
    const result = await adapter.getMultipleAccounts([a, b]);
    expect(result[0]?.address).toBe(a);
    expect(result[1]).toBeNull();
  });

  it("getTransaction returns null when the cluster has no tx", async () => {
    const adapter = createWeb3JsAdapter(mockConnection() as never);
    await expect(adapter.getTransaction("sig")).resolves.toBeNull();
  });

  it("getTransactionWire returns null when missing", async () => {
    const adapter = createWeb3JsAdapter(mockConnection() as never);
    await expect(adapter.getTransactionWire("sig")).resolves.toBeNull();
  });

  it("getBalance returns bigint lamports", async () => {
    const adapter = createWeb3JsAdapter(mockConnection() as never);
    await expect(adapter.getBalance(SYSTEM)).resolves.toBe(1000n);
  });

  it("simulateTransactionBytes rejects garbage bytes as InvalidTransactionError", async () => {
    const adapter = createWeb3JsAdapter(mockConnection() as never);
    await expect(
      adapter.simulateTransactionBytes(new Uint8Array([1, 2, 3])),
    ).rejects.toBeInstanceOf(InvalidTransactionError);
  });

  it("wraps unexpected Connection failures as RpcRequestError", async () => {
    const connection = mockConnection({
      getSlot: vi.fn(async () => {
        throw new Error("offline");
      }),
    });
    const adapter = createWeb3JsAdapter(connection as never);
    await expect(adapter.getSlot()).rejects.toBeInstanceOf(RpcRequestError);
  });
});
