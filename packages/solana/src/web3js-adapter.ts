import {
  Connection,
  PublicKey,
  VersionedTransaction,
  type AccountInfo,
  type ConnectionConfig,
} from "@solana/web3.js";
import { InvalidTransactionError, RpcRequestError } from "./errors.js";
import { decodeBase58 } from "./encoding.js";
import type {
  LatestBlockhash,
  NormalizedAccount,
  NormalizedTransactionLookup,
  SimulateTransactionOptions,
  SolanaRpcAdapter,
  TransactionWire,
} from "./types.js";
import { normalizeSimulateRpcResult } from "./simulate.js";

const COMMITMENT = "confirmed" as const;
const DEFAULT_TIMEOUT_MS = 20_000;

function fetchWithTimeout(timeoutMs: number): NonNullable<ConnectionConfig["fetch"]> {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
}

function keysFromMessage(message: {
  staticAccountKeys?: { toBase58(): string }[];
  accountKeys?: { toBase58(): string }[];
}): string[] {
  const keys = message.staticAccountKeys ?? message.accountKeys ?? [];
  return keys.map((key) => key.toBase58());
}
function toAccount(address: string, info: AccountInfo<Buffer>): NormalizedAccount {
  return {
    address,
    lamports: BigInt(info.lamports),
    owner: info.owner.toBase58(),
    executable: info.executable,
    rentEpoch: typeof info.rentEpoch === "number" ? BigInt(info.rentEpoch) : null,
    dataLength: info.data.length,
    dataBase64: info.data.toString("base64"),
  };
}

async function wrap<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (cause) {
    if (cause instanceof InvalidTransactionError) {
      throw cause;
    }
    throw new RpcRequestError(operation, cause);
  }
}

export function createConnection(rpcUrl: string, timeoutMs = DEFAULT_TIMEOUT_MS): Connection {
  return new Connection(rpcUrl, {
    commitment: COMMITMENT,
    confirmTransactionInitialTimeout: timeoutMs,
    disableRetryOnRateLimit: true,
    fetch: fetchWithTimeout(timeoutMs),
  });
}

export function createWeb3JsAdapter(connection: Connection): SolanaRpcAdapter {
  return {
    async getHealth() {
      return wrap("getHealth", async () => {
        const response = await fetch(connection.rpcEndpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
        });
        if (!response.ok) {
          throw new Error(`getHealth HTTP ${response.status}`);
        }
        const body = (await response.json()) as {
          result?: unknown;
          error?: { message?: string };
        };
        if (body.error) {
          throw new Error(body.error.message ?? "getHealth RPC error");
        }
        if (typeof body.result !== "string") {
          throw new Error("getHealth returned a non-string result");
        }
        return body.result;
      });
    },

    async getSlot() {
      return wrap("getSlot", () => connection.getSlot(COMMITMENT));
    },

    async getLatestBlockhash() {
      return wrap("getLatestBlockhash", async (): Promise<LatestBlockhash> => {
        const result = await connection.getLatestBlockhash(COMMITMENT);
        return {
          blockhash: result.blockhash,
          lastValidBlockHeight: result.lastValidBlockHeight,
        };
      });
    },

    async getAccount(address: string) {
      return wrap("getAccountInfo", async () => {
        const info = await connection.getAccountInfo(new PublicKey(address), COMMITMENT);
        return info ? toAccount(address, info) : null;
      });
    },

    async getMultipleAccounts(addresses: string[]) {
      return wrap("getMultipleAccountsInfo", async () => {
        const keys = addresses.map((value) => new PublicKey(value));
        const infos = await connection.getMultipleAccountsInfo(keys, COMMITMENT);
        return infos.map((info, index) => {
          const address = addresses[index];
          if (address === undefined) {
            return null;
          }
          return info ? toAccount(address, info) : null;
        });
      });
    },

    async getTransaction(signature: string) {
      return wrap("getTransaction", async (): Promise<NormalizedTransactionLookup | null> => {
        const tx = await connection.getTransaction(signature, {
          commitment: COMMITMENT,
          maxSupportedTransactionVersion: 0,
        });
        if (!tx) {
          return null;
        }
        const message = tx.transaction.message;
        const accountKeys = keysFromMessage(message);
        return {
          signature,
          slot: tx.slot,
          blockTime: tx.blockTime ?? null,
          err: tx.meta?.err ?? null,
          feeLamports: tx.meta?.fee ?? null,
          logMessages: tx.meta?.logMessages ?? null,
          accountKeys,
        };
      });
    },

    async getTransactionWire(signature: string) {
      return wrap("getTransaction", async (): Promise<TransactionWire | null> => {
        const tx = await connection.getTransaction(signature, {
          commitment: COMMITMENT,
          maxSupportedTransactionVersion: 0,
        });
        if (!tx) {
          return null;
        }
        const signatureBytes = tx.transaction.signatures.map((value) => decodeBase58(value));
        const versioned = new VersionedTransaction(tx.transaction.message, signatureBytes);
        const loaded = tx.meta?.loadedAddresses;
        return {
          bytes: versioned.serialize(),
          signature,
          slot: tx.slot,
          blockTime: tx.blockTime ?? null,
          err: tx.meta?.err ?? null,
          feeLamports: tx.meta?.fee ?? null,
          loadedAddresses: loaded
            ? {
                writable: loaded.writable.map((key) => key.toBase58()),
                readonly: loaded.readonly.map((key) => key.toBase58()),
              }
            : null,
        };
      });
    },

    async getBalance(address: string) {
      return wrap("getBalance", async () => {
        const lamports = await connection.getBalance(new PublicKey(address), COMMITMENT);
        return BigInt(lamports);
      });
    },

    async simulateTransactionBytes(bytes: Uint8Array, options?: SimulateTransactionOptions) {
      return wrap("simulateTransaction", async () => {
        let transaction: VersionedTransaction;
        try {
          transaction = VersionedTransaction.deserialize(bytes);
        } catch (cause) {
          throw new InvalidTransactionError(
            "Could not deserialize a VersionedTransaction from the provided bytes.",
            cause,
          );
        }
        const accounts = [...(options?.accounts ?? [])];
        const config: Record<string, unknown> = {
          commitment: COMMITMENT,
          replaceRecentBlockhash: true,
          sigVerify: false,
          innerInstructions: true,
        };
        if (accounts.length > 0) {
          config.accounts = { encoding: "base64", addresses: accounts };
        }
        const result = await connection.simulateTransaction(
          transaction,
          config as Parameters<Connection["simulateTransaction"]>[1],
        );
        const context = result as { context?: { slot?: number }; value: unknown };
        return normalizeSimulateRpcResult({
          contextSlot: typeof context.context?.slot === "number" ? context.context.slot : null,
          value: context.value,
          options: accounts.length ? { accounts } : {},
          sigVerify: false,
          replaceRecentBlockhash: true,
        });
      });
    },
  };
}
