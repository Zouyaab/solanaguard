/**
 * Cluster simulation preview (Phase 9).
 *
 * This is not a security guarantee. The cluster can execute differently later
 * (slot, blockhash, competing transactions, program upgrades).
 */

export interface SimulatedReturnData {
  programId: string;
  dataBase64: string;
}

export interface SimulatedInnerInstruction {
  instructionIndex: number;
  programIdIndex: number;
  programId: string | null;
  accountIndexes: number[];
  dataBase64: string;
}

export interface SimulatedAccountView {
  address: string;
  /** RPC returned a post-state snapshot for this requested address. */
  returned: boolean;
  lamports: string | null;
  owner: string | null;
  executable: boolean | null;
  dataLength: number | null;
  dataBase64: string | null;
}

/**
 * JSON-safe simulation report returned by the analyzer, API, and CLI.
 */
export interface SimulationReport {
  success: boolean;
  error: unknown;
  logs: string[];
  unitsConsumed: number | null;
  contextSlot: number | null;
  replacementBlockhash: string | null;
  returnData: SimulatedReturnData | null;
  innerInstructions: SimulatedInnerInstruction[];
  accounts: SimulatedAccountView[];
  accountsRequested: string[];
  accountsReturned: boolean;
  sigVerify: boolean;
  replaceRecentBlockhash: boolean;
  lookupsUnresolved: boolean;
  note: string;
}
