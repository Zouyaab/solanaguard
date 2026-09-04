/**
 * Shared types for SolanaGuard.
 * Rule findings (Phase 7), transparent scores (Phase 8), simulation reports
 * (Phase 9), expected-vs-simulated observations (Phase 10), and the composed
 * analysis report (Phase 11) exist. None of these is a safety verdict.
 */

export type {
  RiskScore,
  RiskScoreBand,
  RuleEvaluation,
  RuleFinding,
  RuleSeverity,
  ScoreContribution,
} from "./rules.js";
export type { TransactionAnalysisReport } from "./analysis.js";
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
export type {
  SimulatedAccountView,
  SimulatedInnerInstruction,
  SimulatedReturnData,
  SimulationReport,
} from "./simulation.js";
export type {
  BehaviorComparison,
  BehaviorComparisonSummary,
  ComparisonObservation,
  ComparisonStatus,
  ExpectedEffect,
  ExpectedEffectKind,
} from "./comparison.js";
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
