/**
 * Rule-engine output types (Phase 7).
 * There is no score here. Scoring is Phase 8.
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
