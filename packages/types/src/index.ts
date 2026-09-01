/**
 * Shared types for SolanaGuard.
 * Rule findings exist (Phase 7). A numeric risk score does not.
 */

export type {
  RuleEvaluation,
  RuleFinding,
  RuleSeverity,
} from "./rules.js";
export type {
  AccountPresence,
  AccountResolutionSummary,
  ConfirmedTransactionContext,
  CurveClass,
  CurveClassificationSummary,
  InstructionArgValue,
  InstructionDecodeStatus,
  NamedInstructionAccount,
  NormalizedAccountKey,
  NormalizedAddressTableLookup,
  NormalizedCompiledInstruction,
  NormalizedTransaction,
  ResolvedAccountSnapshot,
  TransactionInputSource,
  TransactionVersion,
} from "./transaction.js";
export { MAX_SOLANA_TRANSACTION_BYTES } from "./transaction.js";

export const SOLANAGUARD_VERSION = "0.1.0";

export const SOLANAGUARD_NAME = "SolanaGuard";

export type SolanaNetwork = "devnet" | "testnet" | "mainnet-beta" | "localnet";

export interface HealthStatus {
  status: "ok";
  service: typeof SOLANAGUARD_NAME;
  version: typeof SOLANAGUARD_VERSION;
  /** Wall-clock ISO-8601 timestamp of the health check. */
  time: string;
}
