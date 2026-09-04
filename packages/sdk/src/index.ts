/**
 * @solanaguard/sdk — typed HTTP client for the SolanaGuard REST API.
 *
 * Analysis reports are not safety verdicts. A low score or successful simulation
 * does not mean a transaction is safe.
 */

export {
  SolanaGuardClient,
  analyzeTransaction,
  createSolanaGuardClient,
} from "./client.js";
export {
  SolanaGuardApiError,
  SolanaGuardError,
  SolanaGuardNetworkError,
  SolanaGuardNotFoundError,
  SolanaGuardRequestError,
} from "./errors.js";
export type { SolanaGuardErrorBody } from "./errors.js";
export { toTransactionRequest, transactionRequestBody } from "./input.js";
export type {
  AccountLookupResponse,
  AccountView,
  CompareResponse,
  EvaluateRulesResponse,
  NormalizeResponse,
  ProgramLookupResponse,
  RpcStatusResponse,
  ScoreResponse,
  SdkTransactionInput,
  SdkTransactionRequest,
  SimulateResponse,
  SolanaGuardClientOptions,
  TransactionLookupResponse,
  VersionResponse,
} from "./types.js";
export type {
  BehaviorComparison,
  HealthStatus,
  NormalizedTransaction,
  RiskScore,
  RuleEvaluation,
  SimulationReport,
  TransactionAnalysisReport,
} from "./types.js";
