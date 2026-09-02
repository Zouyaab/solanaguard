export { evaluateRules, RULE_EVALUATION_NOTE } from "./evaluate.js";
export {
  DEFAULT_SCORE_CAP,
  DEFAULT_SEVERITY_WEIGHTS,
  evaluateAndScore,
  RISK_SCORE_NOTE,
  scoreEvaluation,
} from "./score.js";
export type { ScoreOptions, ScoredRuleResult } from "./score.js";
export { defaultRiskRules } from "./defaults.js";
export { mergeRules } from "./plugin.js";
export type { RiskRule } from "./plugin.js";
