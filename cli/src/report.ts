import type { TransactionAnalysisReport } from "@solanaguard/types";

/**
 * Human-readable analyze report for the CLI.
 * Language stays observational — never a pass/fail safety verdict.
 */
export function formatAnalysisReport(report: TransactionAnalysisReport): string {
  const lines: string[] = [];
  lines.push("SOLANAGUARD TRANSACTION REPORT");
  lines.push("");
  lines.push(`Score band: ${report.score.band}`);
  lines.push(`Score: ${report.score.total}/${report.score.cap}`);
  lines.push(`(transparent weighted findings — ${report.score.note})`);
  lines.push("");
  lines.push("FINDINGS");
  if (report.evaluation.findings.length === 0) {
    lines.push("(none — empty findings are not a pass)");
  } else {
    for (const finding of report.evaluation.findings) {
      lines.push(`${finding.severity}`);
      lines.push(`${finding.title}`);
      lines.push(finding.explanation);
      lines.push("");
    }
  }
  lines.push("SIMULATION");
  if (!report.simulation) {
    lines.push("not run (RPC unavailable or --no-simulation)");
  } else {
    lines.push(`success: ${report.simulation.success}`);
    if (report.simulation.error !== null && report.simulation.error !== undefined) {
      lines.push(`error: ${JSON.stringify(report.simulation.error)}`);
    }
    if (report.simulation.unitsConsumed !== null) {
      lines.push(`unitsConsumed: ${report.simulation.unitsConsumed}`);
    }
    lines.push(`(${report.simulation.note})`);
  }
  lines.push("");
  lines.push("COMPARISON");
  if (!report.comparison) {
    lines.push("not run");
  } else {
    const { summary } = report.comparison;
    lines.push(
      `matched: ${summary.matched}  diverged: ${summary.diverged}  incomplete: ${summary.incomplete}  not_applicable: ${summary.notApplicable}`,
    );
    lines.push(`(${report.comparison.note})`);
  }
  lines.push("");
  lines.push(report.note);
  lines.push("");
  return lines.join("\n");
}
