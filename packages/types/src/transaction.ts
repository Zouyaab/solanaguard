/**
 * Shared normalized transaction shape.
 * Phase 6 classifies Ed25519 on/off-curve keys. Risk scoring is later.
 */

export const MAX_SOLANA_TRANSACTION_BYTES = 1232;

export type TransactionVersion = "legacy" | 0;

export type TransactionInputSource = "bytes" | "base64" | "versioned" | "legacy" | "signature";

export type InstructionDecodeStatus =
  "decoded" | "unknown_program" | "unresolved_program_id" | "unrecognized_layout";

export type InstructionArgValue = string | number | boolean | null;

export interface NamedInstructionAccount {
  name: string;
  index: number;
  address: string | null;
}

export type CurveClass = "on_curve" | "off_curve";

export interface NormalizedAccountKey {
  address: string;
  signer: boolean;
  writable: boolean;
  source: "static" | "address_lookup_table";
  onCurve: boolean;
  curveClass: CurveClass;
}

export interface NormalizedCompiledInstruction {
  index: number;
  programAccountIndex: number;
  /** Null when the program id index points into an unresolved lookup table. */
  programId: string | null;
  accountIndexes: number[];
  dataBase64: string;
  decoded: boolean;
  decodeStatus: InstructionDecodeStatus;
  programName: string | null;
  instructionType: string | null;
  namedAccounts: NamedInstructionAccount[];
  args: Record<string, InstructionArgValue>;
}

export interface NormalizedAddressTableLookup {
  accountKey: string;
  writableIndexes: number[];
  readonlyIndexes: number[];
}

export type AccountPresence = "found" | "not_found";

export interface ResolvedAccountSnapshot {
  address: string;
  presence: AccountPresence;
  lamports: string | null;
  owner: string | null;
  executable: boolean | null;
  dataLength: number | null;
  onCurve: boolean;
  curveClass: CurveClass;
}

export interface CurveClassificationSummary {
  onCurve: number;
  offCurve: number;
  /**
   * Required signers whose keys are off-curve. Unusual for Ed25519 signatures;
   * not by itself evidence of malice.
   */
  signerOffCurve: number;
}

export interface AccountResolutionSummary {
  attempted: boolean;
  found: number;
  notFound: number;
}

export interface ConfirmedTransactionContext {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: unknown;
  feeLamports: number | null;
}

export interface NormalizedTransaction {
  version: TransactionVersion;
  feePayer: string | null;
  recentBlockhash: string;
  accountKeys: NormalizedAccountKey[];
  addressTableLookups: NormalizedAddressTableLookup[];
  /**
   * True when the message references lookup tables that were not supplied
   * (local bytes without loaded addresses). Not a risk finding.
   */
  lookupsUnresolved: boolean;
  instructions: NormalizedCompiledInstruction[];
  signaturesBase58: string[];
  signed: boolean;
  byteLength: number;
  source: TransactionInputSource;
  confirmation: ConfirmedTransactionContext | null;
  /**
   * Cluster snapshots for unique account keys (and lookup-table accounts).
   * Empty when resolution was not attempted. `not_found` is missing data, not a risk finding.
   */
  resolvedAccounts: ResolvedAccountSnapshot[];
  accountResolution: AccountResolutionSummary;
  curveClassification: CurveClassificationSummary;
  notes: string[];
}
