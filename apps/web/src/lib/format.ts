import type { RiskScoreBand, RuleSeverity } from "@solanaguard/types";

export function bandLabel(band: RiskScoreBand): string {
  switch (band) {
    case "no_findings":
      return "No findings";
    case "informational":
      return "Informational";
    case "elevated":
      return "Elevated";
    case "requires_review":
      return "Requires review";
    default:
      return band;
  }
}

export function severityTone(severity: RuleSeverity): string {
  switch (severity) {
    case "info":
      return "border-mist-deep bg-foam text-ink-soft";
    case "unusual":
      return "border-ember/30 bg-ember-soft text-ember";
    case "needs_review":
      return "border-ember/40 bg-ember-soft text-ember";
    default:
      return "border-mist-deep bg-foam text-ink-soft";
  }
}

export function shorten(value: string, left = 4, right = 4): string {
  if (value.length <= left + right + 1) {
    return value;
  }
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}
