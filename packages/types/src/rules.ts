/**
 * Rule findings (Phase 7) and transparent scoring (Phase 8).
 *
 * A score is a weighted sum of finding severities. It is not a safety verdict
 * and not evidence of attack.
 */

export type RuleSeverity = "info" | "unusual" | "needs_review";

export interface RuleFinding {
  ruleId: string;
  title: string;
  explanation: string;
  severity: RuleSeverity;
  evidence: Record<string, string | number | boolean | null>;
}

export interface RuleEvaluation {
  findings: RuleFinding[];
  rulesEvaluated: number;
  rulesFired: number;
  /**
   * Always present so callers do not treat an empty findings list as "safe".
   */
  note: string;
}

/** How much attention the weighted total suggests. Not a pass/fail. */
export type RiskScoreBand =
  | "no_findings"
  | "informational"
  | "elevated"
  | "requires_review";

export interface ScoreContribution {
  ruleId: string;
  title: string;
  severity: RuleSeverity;
  /** Points this finding added before the total was capped. */
  points: number;
  /** Why those points were assigned (severity weight). */
  reason: string;
}

/**
 * Transparent score derived only from rule findings.
 * `total` is capped at `cap`. Empty findings yield 0 — that is not "safe".
 */
export interface RiskScore {
  total: number;
  cap: number;
  band: RiskScoreBand;
  contributions: ScoreContribution[];
  weights: Record<RuleSeverity, number>;
  note: string;
}
