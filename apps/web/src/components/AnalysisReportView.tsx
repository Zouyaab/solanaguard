"use client";

import type { TransactionAnalysisReport } from "@solanaguard/types";
import { bandLabel, severityTone, shorten } from "@/lib/format";
import { JsonBlock } from "./JsonBlock";

export function AnalysisReportView({ report }: { report: TransactionAnalysisReport }) {
  return (
    <div className="space-y-8">
      <section className="border border-ink/10 bg-foam/80 p-6 shadow-panel">
        <p className="text-sm uppercase tracking-wide text-ink-muted">Score band</p>
        <h2 className="mt-1 font-display text-3xl text-ink">{bandLabel(report.score.band)}</h2>
        <p className="mt-2 font-mono text-lg text-ink-soft">
          {report.score.total}/{report.score.cap}
        </p>
        <p className="mt-3 max-w-3xl text-sm text-ink-muted">{report.score.note}</p>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">{report.note}</p>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-2xl text-ink">Findings</h3>
        {report.evaluation.findings.length === 0 ? (
          <p className="text-sm text-ink-muted">(none — empty findings are not a pass)</p>
        ) : (
          <ul className="space-y-3">
            {report.evaluation.findings.map((finding) => (
              <li
                key={`${finding.ruleId}-${finding.title}`}
                className={`border px-4 py-3 ${severityTone(finding.severity)}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide">{finding.severity}</p>
                <p className="mt-1 font-medium">{finding.title}</p>
                <p className="mt-1 text-sm opacity-90">{finding.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="border border-ink/10 bg-foam/80 p-5">
          <h3 className="font-display text-xl text-ink">Simulation</h3>
          {!report.simulation ? (
            <p className="mt-2 text-sm text-ink-muted">Not run.</p>
          ) : (
            <div className="mt-2 space-y-2 text-sm text-ink-soft">
              <p>
                success: <span className="font-mono">{String(report.simulation.success)}</span>
              </p>
              {report.simulation.unitsConsumed !== null ? (
                <p>
                  unitsConsumed:{" "}
                  <span className="font-mono">{report.simulation.unitsConsumed}</span>
                </p>
              ) : null}
              <p className="text-ink-muted">{report.simulation.note}</p>
              {report.simulation.logs.length > 0 ? (
                <pre className="mt-3 max-h-48 overflow-auto border border-ink/10 bg-mist/60 p-3 font-mono text-xs">
                  {report.simulation.logs.join("\n")}
                </pre>
              ) : null}
            </div>
          )}
        </div>
        <div className="border border-ink/10 bg-foam/80 p-5">
          <h3 className="font-display text-xl text-ink">Comparison</h3>
          {!report.comparison ? (
            <p className="mt-2 text-sm text-ink-muted">Not run.</p>
          ) : (
            <div className="mt-2 space-y-2 text-sm text-ink-soft">
              <p className="font-mono text-xs">
                matched {report.comparison.summary.matched} · diverged{" "}
                {report.comparison.summary.diverged} · incomplete{" "}
                {report.comparison.summary.incomplete} · n/a{" "}
                {report.comparison.summary.notApplicable}
              </p>
              <p className="text-ink-muted">{report.comparison.note}</p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-2xl text-ink">Instructions</h3>
        <ul className="space-y-2">
          {report.transaction.instructions.map((ix, index) => (
            <li key={index} className="border border-ink/10 bg-foam/80 px-4 py-3 text-sm">
              <p className="font-mono text-xs text-ink-muted">#{index}</p>
              <p className="mt-1 font-medium text-ink">
                {ix.programName ?? (ix.programId ? shorten(ix.programId) : "unresolved program")}
                {ix.instructionType ? ` · ${ix.instructionType}` : ""}
              </p>
              <p className="mt-1 text-ink-muted">
                decoded: {String(ix.decoded)} · status: {ix.decodeStatus}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-2xl text-ink">Accounts</h3>
        <ul className="space-y-2">
          {report.transaction.accountKeys.map((account) => (
            <li
              key={account.address}
              className="flex flex-wrap items-baseline justify-between gap-2 border border-ink/10 bg-foam/80 px-4 py-3 font-mono text-xs"
            >
              <span>{account.address}</span>
              <span className="text-ink-muted">
                {account.signer ? "signer" : "non-signer"}
                {account.writable ? " · writable" : ""}
                {account.curveClass ? ` · ${account.curveClass}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <JsonBlock title="Raw report JSON" value={report} />
    </div>
  );
}
