import type {
  NormalizedTransaction,
  RiskScore,
  RiskScoreBand,
  RuleEvaluation,
  RuleFinding,
  RuleSeverity,
  ScoreContribution,
} from "@solanaguard/types";
import { evaluateRules } from "./evaluate.js";
import { defaultRiskRules } from "./defaults.js";
import type { RiskRule } from "./plugin.js";

/** Default points per finding severity. Exported so docs and tests stay honest. */
export const DEFAULT_SEVERITY_WEIGHTS: Readonly<Record<RuleSeverity, number>> = {
  info: 5,
  unusual: 20,
  needs_review: 35,
};

/** Hard ceiling so a long finding list cannot invent an unbounded number. */
export const DEFAULT_SCORE_CAP = 100;

export const RISK_SCORE_NOTE =
  "This score is a transparent weighted total of deterministic rule findings. " +
  "It is not a proof of safety, not a proof of attack, and not a substitute for review. " +
  "A total of 0 means no built-in rule fired — not that the transaction is safe.";

export interface ScoreOptions {
  weights?: Partial<Record<RuleSeverity, number>>;
  cap?: number;
}

function resolveWeights(
  overrides?: Partial<Record<RuleSeverity, number>>,
): Record<RuleSeverity, number> {
  const weights: Record<RuleSeverity, number> = { ...DEFAULT_SEVERITY_WEIGHTS };
  if (overrides) {
    for (const key of Object.keys(overrides) as RuleSeverity[]) {
      const value = overrides[key];
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        weights[key] = value;
      }
    }
  }
  return weights;
}

function bandFor(total: number, findingCount: number): RiskScoreBand {
  if (findingCount === 0 || total === 0) {
    return "no_findings";
  }
  if (total < 20) {
    return "informational";
  }
  if (total < 50) {
    return "elevated";
  }
  return "requires_review";
}

function contributionFor(
  finding: RuleFinding,
  weights: Record<RuleSeverity, number>,
): ScoreContribution {
  const points = weights[finding.severity];
  return {
    ruleId: finding.ruleId,
    title: finding.title,
    severity: finding.severity,
    points,
    reason: `severity "${finding.severity}" weighs ${points} points`,
  };
}

/**
 * Score an existing rule evaluation. Pure: no RPC, no mutation of findings.
 */
export function scoreEvaluation(
  evaluation: RuleEvaluation,
  options: ScoreOptions = {},
): RiskScore {
  const weights = resolveWeights(options.weights);
  const cap =
    typeof options.cap === "number" && Number.isFinite(options.cap) && options.cap > 0
      ? Math.floor(options.cap)
      : DEFAULT_SCORE_CAP;

  const contributions = evaluation.findings.map((finding) =>
    contributionFor(finding, weights),
  );
  const raw = contributions.reduce((sum, item) => sum + item.points, 0);
  const total = Math.min(cap, raw);

  return {
    total,
    cap,
    band: bandFor(total, evaluation.findings.length),
    contributions,
    weights,
    note: RISK_SCORE_NOTE,
  };
}

export interface ScoredRuleResult {
  evaluation: RuleEvaluation;
  score: RiskScore;
}

/** Evaluate rules then attach a transparent score breakdown. */
export function evaluateAndScore(
  transaction: NormalizedTransaction,
  rules: readonly RiskRule[] = defaultRiskRules,
  options: ScoreOptions = {},
): ScoredRuleResult {
  const evaluation = evaluateRules(transaction, rules);
  return {
    evaluation,
    score: scoreEvaluation(evaluation, options),
  };
}
