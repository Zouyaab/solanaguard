/**
 * Expected-vs-simulated behavior (Phase 10).
 *
 * Observations compare decoded instruction effects to a simulation preview.
 * They are not a safety verdict and not evidence of attack.
 */

export type ExpectedEffectKind =
  | "lamport_debit"
  | "lamport_credit"
  | "token_amount"
  | "account_close"
  | "owner_assign"
  | "undecoded_instruction";

export interface ExpectedEffect {
  kind: ExpectedEffectKind;
  instructionIndex: number;
  programId: string | null;
  instructionType: string | null;
  address: string | null;
  /** Lamports or token amount as a decimal string when known. */
  amount: string | null;
  detail: string;
}

export type ComparisonStatus =
  | "matched"
  | "diverged"
  | "incomplete"
  | "not_applicable";

export interface ComparisonObservation {
  id: string;
  status: ComparisonStatus;
  title: string;
  explanation: string;
  expected: string | null;
  observed: string | null;
  evidence: Record<string, string | number | boolean | null>;
}

export interface BehaviorComparisonSummary {
  matched: number;
  diverged: number;
  incomplete: number;
  notApplicable: number;
}

/**
 * Pure comparison of decoded expectations against a simulation report.
 * A clean result is not a proof of safety.
 */
export interface BehaviorComparison {
  expectedEffects: ExpectedEffect[];
  observations: ComparisonObservation[];
  summary: BehaviorComparisonSummary;
  note: string;
}
