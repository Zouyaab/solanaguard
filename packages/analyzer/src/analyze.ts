import { evaluateAndScore } from "@solanaguard/risk-engine";
import type { SolanaRpc } from "@solanaguard/solana";
import type { TransactionAnalysisReport } from "@solanaguard/types";
import { compareNormalizedTransaction } from "./compare.js";
import { normalizeTransaction, type TransactionInput } from "./normalize.js";

export const TRANSACTION_ANALYSIS_NOTE =
  "This report combines normalized structure, deterministic rule findings, a transparent score, " +
  "and optional simulation/comparison when RPC is available. " +
  "It is not a safety verdict, not a proof of attack, and not a substitute for review.";

export interface AnalyzeOptions {
  rpc?: SolanaRpc;
  /** When true and RPC is set, run simulate + expected-vs-simulated compare. Default true. */
  includeSimulation?: boolean;
}

/**
 * Orchestrates normalize → rules/score → optional compare for API and CLI analyze.
 */
export async function analyzeTransaction(
  input: TransactionInput,
  options: AnalyzeOptions = {},
): Promise<TransactionAnalysisReport> {
  const includeSimulation = options.includeSimulation !== false;

  if (options.rpc && includeSimulation) {
    const compared = await compareNormalizedTransaction(input, { rpc: options.rpc });
    const { evaluation, score } = evaluateAndScore(compared.transaction);
    return {
      transaction: compared.transaction,
      evaluation,
      score,
      simulation: compared.simulation,
      comparison: compared.comparison,
      note: TRANSACTION_ANALYSIS_NOTE,
    };
  }

  const normalizeOptions = options.rpc ? { rpc: options.rpc } : undefined;
  const transaction = await normalizeTransaction(input, normalizeOptions);
  const { evaluation, score } = evaluateAndScore(transaction);
  return {
    transaction,
    evaluation,
    score,
    simulation: null,
    comparison: null,
    note: TRANSACTION_ANALYSIS_NOTE,
  };
}
