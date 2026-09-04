/**
 * SDK-facing request/response shapes for the SolanaGuard HTTP API.
 * Analysis fields re-use @solanaguard/types. None of this is a safety verdict.
 */

import type {
  BehaviorComparison,
  HealthStatus,
  NormalizedTransaction,
  RiskScore,
  RuleEvaluation,
  SimulationReport,
  TransactionAnalysisReport,
} from "@solanaguard/types";

/** Exactly one of base64 or signature. Optional simulate flag for analyze only. */
export type SdkTransactionRequest =
  | {
      base64: string;
      includeSimulation?: boolean;
    }
  | {
      signature: string;
      includeSimulation?: boolean;
    };

/**
 * Inputs the SDK can encode into an API body.
 * Bytes and bare strings become `{ base64 }`.
 */
export type SdkTransactionInput =
  | SdkTransactionRequest
  | Uint8Array
  | string;

export interface SolanaGuardClientOptions {
  /** API origin, e.g. `http://127.0.0.1:3001`. Trailing slash is stripped. */
  baseUrl: string;
  /** Override fetch (tests, polyfills). Defaults to global `fetch`. */
  fetch?: typeof fetch;
  /** Extra headers sent on every request. */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds. Default 30_000. */
  timeoutMs?: number;
}

export interface VersionResponse {
  name: string;
  version: string;
  phase: number;
  note: string;
}

export interface RpcStatusResponse {
  reachable: boolean;
  slot: number | null;
  endpoint: string;
  [key: string]: unknown;
}

export interface AccountView {
  address: string;
  lamports: string;
  owner: string;
  executable: boolean;
  rentEpoch: string | null;
  dataLength: number;
  dataBase64: string;
  onCurve: boolean;
  curveClass: string;
}

export interface AccountLookupResponse {
  found: true;
  account: AccountView;
}

export interface ProgramLookupResponse {
  found: true;
  programId: string;
  executable: boolean;
  account: AccountView;
  note: string;
}

export interface TransactionLookupResponse {
  found: true;
  transaction: unknown;
}

export interface NormalizeResponse {
  transaction: NormalizedTransaction;
}

export interface EvaluateRulesResponse {
  transaction: NormalizedTransaction;
  evaluation: RuleEvaluation;
}

export interface ScoreResponse {
  transaction: NormalizedTransaction;
  evaluation: RuleEvaluation;
  score: RiskScore;
}

export interface SimulateResponse {
  transaction: NormalizedTransaction;
  simulation: SimulationReport;
}

export interface CompareResponse {
  transaction: NormalizedTransaction;
  simulation: SimulationReport;
  comparison: BehaviorComparison;
}

export type {
  BehaviorComparison,
  HealthStatus,
  NormalizedTransaction,
  RiskScore,
  RuleEvaluation,
  SimulationReport,
  TransactionAnalysisReport,
};
