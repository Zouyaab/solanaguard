import { VersionedTransaction } from "@solana/web3.js";
import { addressToBase58, publicEndpointLabel } from "./address.js";
import { InvalidTransactionError } from "./errors.js";
import {
  MAX_GET_MULTIPLE_ACCOUNTS,
  type LatestBlockhash,
  type NormalizedAccount,
  type NormalizedSimulation,
  type NormalizedTransactionLookup,
  type RpcStatus,
  type SolanaRpcAdapter,
  type TransactionWire,
} from "./types.js";

export const GET_MULTIPLE_ACCOUNTS_LIMIT = MAX_GET_MULTIPLE_ACCOUNTS;

export class SolanaRpc {
  constructor(
    private readonly adapter: SolanaRpcAdapter,
    private readonly endpoint: string,
  ) {}

  endpointLabel(): string {
    return publicEndpointLabel(this.endpoint);
  }

  async getHealth(): Promise<string> {
    return this.adapter.getHealth();
  }

  async getSlot(): Promise<number> {
    return this.adapter.getSlot();
  }

  async getLatestBlockhash(): Promise<LatestBlockhash> {
    return this.adapter.getLatestBlockhash();
  }

  async getAccount(address: string): Promise<NormalizedAccount | null> {
    return this.adapter.getAccount(addressToBase58(address));
  }

  async getMultipleAccounts(addresses: string[]): Promise<(NormalizedAccount | null)[]> {
    if (addresses.length === 0) {
      return [];
    }
    const normalized = addresses.map((address) => addressToBase58(address));
    const out: (NormalizedAccount | null)[] = [];
    for (let i = 0; i < normalized.length; i += GET_MULTIPLE_ACCOUNTS_LIMIT) {
      const chunk = normalized.slice(i, i + GET_MULTIPLE_ACCOUNTS_LIMIT);
      const result = await this.adapter.getMultipleAccounts(chunk);
      out.push(...result);
    }
    return out;
  }

  async getTransaction(signature: string): Promise<NormalizedTransactionLookup | null> {
    const trimmed = signature.trim();
    if (trimmed.length < 64) {
      throw new InvalidTransactionError(
        `Transaction signature is too short to be a Solana signature: ${JSON.stringify(signature)}`,
      );
    }
    return this.adapter.getTransaction(trimmed);
  }

  async getTransactionWire(signature: string): Promise<TransactionWire | null> {
    const trimmed = signature.trim();
    if (trimmed.length < 64) {
      throw new InvalidTransactionError(
        `Transaction signature is too short to be a Solana signature: ${JSON.stringify(signature)}`,
      );
    }
    return this.adapter.getTransactionWire(trimmed);
  }

  async getBalance(address: string): Promise<bigint> {
    return this.adapter.getBalance(addressToBase58(address));
  }

  async simulateTransaction(
    input: VersionedTransaction | Uint8Array,
  ): Promise<NormalizedSimulation> {
    const bytes = input instanceof Uint8Array ? input : input.serialize();
    if (bytes.length === 0) {
      throw new InvalidTransactionError("Transaction bytes are empty.");
    }
    return this.adapter.simulateTransactionBytes(bytes);
  }

  async getStatus(): Promise<RpcStatus> {
    try {
      const [health, slot] = await Promise.all([this.adapter.getHealth(), this.adapter.getSlot()]);
      return {
        reachable: true,
        health,
        slot,
        endpoint: this.endpointLabel(),
        error: null,
      };
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : String(cause);
      return {
        reachable: false,
        health: null,
        slot: null,
        endpoint: this.endpointLabel(),
        error,
      };
    }
  }
}
