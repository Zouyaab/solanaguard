import type { NormalizedTransaction, RuleFinding } from "@solanaguard/types";

export interface RiskRule {
  id: string;
  title: string;
  /**
   * Return zero or more findings. Null/empty means the rule observed nothing
   * that requires reporting. Rules must not use the words safe, secure, or
   * malicious.
   */
  evaluate(transaction: NormalizedTransaction): readonly RuleFinding[] | null;
}

export function mergeRules(base: readonly RiskRule[], extra: readonly RiskRule[]): RiskRule[] {
  const byId = new Map<string, RiskRule>();
  for (const rule of base) {
    byId.set(rule.id, rule);
  }
  for (const rule of extra) {
    byId.set(rule.id, rule);
  }
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}
