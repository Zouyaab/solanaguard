/**
 * Full transaction analysis report (Phase 11).
 *
 * Composes normalize + rules + score + optional simulation/comparison.
 * None of this is a safety verdict.
 */

import type { BehaviorComparison } from "./comparison.js";
import type { RiskScore, RuleEvaluation } from "./rules.js";
import type { SimulationReport } from "./simulation.js";
import type { NormalizedTransaction } from "./transaction.js";

/**
 * Structured report returned by `POST /api/v1/analyze/transaction`.
 * Simulation and comparison are null when RPC was unavailable or skipped.
 */
export interface TransactionAnalysisReport {
  transaction: NormalizedTransaction;
  evaluation: RuleEvaluation;
  score: RiskScore;
  /** Present when the request ran against an RPC client; otherwise null. */
  simulation: SimulationReport | null;
  /** Present when simulation ran; otherwise null. */
  comparison: BehaviorComparison | null;
  /**
   * Always present so callers do not treat a low score or matched comparison
   * as proof the transaction is safe.
   */
  note: string;
}
