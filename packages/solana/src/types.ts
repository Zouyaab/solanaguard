export interface LatestBlockhash {
  blockhash: string;
  lastValidBlockHeight: number;
}

export interface NormalizedAccount {
  address: string;
  lamports: bigint;
  owner: string;
  executable: boolean;
  rentEpoch: bigint | null;
  dataLength: number;
  dataBase64: string;
}

export interface NormalizedTransactionLookup {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: unknown;
  feeLamports: number | null;
  logMessages: string[] | null;
  accountKeys: string[];
}

export interface TransactionWire {
  bytes: Uint8Array;
  signature: string;
  slot: number;
  blockTime: number | null;
  err: unknown;
  feeLamports: number | null;
  loadedAddresses: {
    writable: string[];
    readonly: string[];
  } | null;
}

export interface SimulatedAccountSnapshot {
  address: string;
  returned: boolean;
  lamports: number | null;
  owner: string | null;
  executable: boolean | null;
  dataLength: number;
  dataBase64: string | null;
}

export interface SimulatedInnerCompiled {
  instructionIndex: number;
  programIdIndex: number;
  programId: string | null;
  accountIndexes: number[];
  dataBase64: string;
}

export interface NormalizedSimulation {
  /**
   * True when the RPC returned a simulation result.
   * This is not a security guarantee that the transaction is safe to sign.
   */
  available: true;
  success: boolean;
  error: unknown;
  logs: string[];
  unitsConsumed: number | null;
  contextSlot: number | null;
  replacementBlockhash: string | null;
  returnData: { programId: string; dataBase64: string } | null;
  innerInstructions: SimulatedInnerCompiled[];
  accounts: SimulatedAccountSnapshot[];
  accountsRequested: string[];
  accountsReturned: boolean;
  sigVerify: boolean;
  replaceRecentBlockhash: boolean;
}

export interface SimulateTransactionOptions {
  accounts?: readonly string[];
}

export interface RpcStatus {
  reachable: boolean;
  health: string | null;
  slot: number | null;
  /** RPC origin only; query-string API keys are stripped. */
  endpoint: string;
  error: string | null;
}

export interface SolanaRpcAdapter {
  getHealth(): Promise<string>;
  getSlot(): Promise<number>;
  getLatestBlockhash(): Promise<LatestBlockhash>;
  getAccount(address: string): Promise<NormalizedAccount | null>;
  getMultipleAccounts(addresses: string[]): Promise<(NormalizedAccount | null)[]>;
  getTransaction(signature: string): Promise<NormalizedTransactionLookup | null>;
  getTransactionWire(signature: string): Promise<TransactionWire | null>;
  getBalance(address: string): Promise<bigint>;
  simulateTransactionBytes(
    bytes: Uint8Array,
    options?: SimulateTransactionOptions,
  ): Promise<NormalizedSimulation>;
}

export const MAX_GET_MULTIPLE_ACCOUNTS = 100;

export function stubNormalizedSimulation(
  overrides: Partial<NormalizedSimulation> = {},
): NormalizedSimulation {
  return {
    available: true,
    success: false,
    error: null,
    logs: [],
    unitsConsumed: null,
    contextSlot: null,
    replacementBlockhash: null,
    returnData: null,
    innerInstructions: [],
    accounts: [],
    accountsRequested: [],
    accountsReturned: false,
    sigVerify: false,
    replaceRecentBlockhash: true,
    ...overrides,
  };
}
