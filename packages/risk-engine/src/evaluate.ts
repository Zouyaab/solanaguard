import type { NormalizedTransaction, RuleEvaluation, RuleFinding } from "@solanaguard/types";
import { defaultRiskRules } from "./defaults.js";
import { mergeRules, type RiskRule } from "./plugin.js";

export const RULE_EVALUATION_NOTE =
  "Findings are deterministic observations that may require review. This is not a risk score, not a safety verdict, and not evidence of malice.";

export function evaluateRules(
  transaction: NormalizedTransaction,
  rules: readonly RiskRule[] = defaultRiskRules,
): RuleEvaluation {
  const ordered = mergeRules(rules, []);
  const findings: RuleFinding[] = [];
  for (const rule of ordered) {
    const produced = rule.evaluate(transaction);
    if (!produced || produced.length === 0) {
      continue;
    }
    findings.push(...produced);
  }
  findings.sort((left, right) => {
    const byId = left.ruleId.localeCompare(right.ruleId);
    if (byId !== 0) {
      return byId;
    }
    return left.title.localeCompare(right.title);
  });
  return {
    findings,
    rulesEvaluated: ordered.length,
    rulesFired: new Set(findings.map((item) => item.ruleId)).size,
    note: RULE_EVALUATION_NOTE,
  };
}
