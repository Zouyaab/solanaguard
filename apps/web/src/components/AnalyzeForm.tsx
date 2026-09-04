"use client";

import { useState, type FormEvent } from "react";
import type { TransactionAnalysisReport } from "@solanaguard/types";
import {
  SolanaGuardApiError,
  SolanaGuardNetworkError,
  SolanaGuardNotFoundError,
} from "@solanaguard/sdk";
import { createWebClient } from "@/lib/api";
import { AnalysisReportView } from "./AnalysisReportView";
import { DisclaimerBanner } from "./DisclaimerBanner";

type Mode = "base64" | "signature";

export function AnalyzeForm() {
  const [mode, setMode] = useState<Mode>("base64");
  const [value, setValue] = useState("");
  const [includeSimulation, setIncludeSimulation] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TransactionAnalysisReport | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const client = createWebClient();
      const trimmed = value.trim();
      if (!trimmed) {
        throw new Error("Paste a base64 transaction or a confirmed signature.");
      }
      const next =
        mode === "base64"
          ? await client.analyzeTransaction({
              base64: trimmed,
              includeSimulation,
            })
          : await client.analyzeTransaction({
              signature: trimmed,
              includeSimulation,
            });
      setReport(next);
    } catch (err) {
      if (
        err instanceof SolanaGuardNotFoundError ||
        err instanceof SolanaGuardApiError ||
        err instanceof SolanaGuardNetworkError
      ) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Analysis failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <DisclaimerBanner />
      <form onSubmit={onSubmit} className="space-y-5 border border-ink/10 bg-foam/80 p-6 shadow-panel">
        <div className="flex flex-wrap gap-3 text-sm">
          <button
            type="button"
            className={`border px-3 py-1.5 ${mode === "base64" ? "border-tide bg-tide-soft text-tide-deep" : "border-ink/15 text-ink-soft"}`}
            onClick={() => setMode("base64")}
          >
            Base64 transaction
          </button>
          <button
            type="button"
            className={`border px-3 py-1.5 ${mode === "signature" ? "border-tide bg-tide-soft text-tide-deep" : "border-ink/15 text-ink-soft"}`}
            onClick={() => setMode("signature")}
          >
            Signature
          </button>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-ink-soft">
            {mode === "base64" ? "Wire transaction (base64)" : "Confirmed signature"}
          </span>
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={mode === "base64" ? 6 : 2}
            className="w-full border border-ink/15 bg-white px-3 py-2 font-mono text-sm text-ink outline-none focus:border-tide"
            placeholder={mode === "base64" ? "Paste base64…" : "Paste signature…"}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={includeSimulation}
            onChange={(event) => setIncludeSimulation(event.target.checked)}
          />
          Include simulation and comparison (requires API RPC)
        </label>
        <button
          type="submit"
          disabled={busy}
          className="border border-tide-deep bg-tide px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Analyzing…" : "Analyze transaction"}
        </button>
        {error ? <p className="text-sm text-ember">{error}</p> : null}
      </form>
      {report ? <AnalysisReportView report={report} /> : null}
    </div>
  );
}
