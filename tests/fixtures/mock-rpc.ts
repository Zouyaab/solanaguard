import {
  SolanaRpc,
  stubNormalizedSimulation,
  type NormalizedAccount,
  type SolanaRpcAdapter,
} from "@solanaguard/solana";
import { WELL_KNOWN } from "./well-known.js";
import { FIXTURE_BLOCKHASH } from "./transactions.js";

function systemProgramAccount(address: string): NormalizedAccount {
  return {
    address,
    lamports: 1n,
    owner: WELL_KNOWN.nativeLoader,
    executable: true,
    rentEpoch: null,
    dataLength: 0,
    dataBase64: "",
  };
}

function isKnownProgram(address: string): boolean {
  return (
    address === WELL_KNOWN.systemProgram ||
    address === WELL_KNOWN.tokenProgram ||
    address === WELL_KNOWN.memoV2 ||
    address === WELL_KNOWN.computeBudget
  );
}

/**
 * Stub RPC for offline fixture tests and benchmarks.
 * Responses are explicit test doubles — not checked-in Devnet recordings.
 */
export function createFixtureRpc(overrides: Partial<SolanaRpcAdapter> = {}): SolanaRpc {
  const adapter: SolanaRpcAdapter = {
    getHealth: async () => "ok",
    getSlot: async () => 1,
    getLatestBlockhash: async () => ({
      blockhash: FIXTURE_BLOCKHASH,
      lastValidBlockHeight: 1,
    }),
    getAccount: async (address: string) =>
      address === WELL_KNOWN.systemProgram ? systemProgramAccount(address) : null,
    getMultipleAccounts: async (addresses: string[]) =>
      addresses.map((address) => (isKnownProgram(address) ? systemProgramAccount(address) : null)),
    getTransaction: async () => null,
    getTransactionWire: async () => null,
    getBalance: async () => 0n,
    simulateTransactionBytes: async (_bytes, options) =>
      stubNormalizedSimulation({
        success: false,
        error: "AccountNotFound",
        logs: [],
        unitsConsumed: 0,
        accountsRequested: [...(options?.accounts ?? [])],
        accountsReturned: true,
        accounts: (options?.accounts ?? []).map((address) => ({
          address,
          returned: false,
          lamports: null,
          owner: null,
          executable: null,
          dataLength: 0,
          dataBase64: null,
        })),
      }),
    ...overrides,
  };
  return new SolanaRpc(adapter, "https://api.devnet.solana.com");
}
