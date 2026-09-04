import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import type { Transaction } from "@solana/web3.js";
import {
  createSolanaGuardClient,
  SolanaGuardApiError,
  SolanaGuardNetworkError,
  type TransactionAnalysisReport,
} from "@solanaguard/sdk";
import {
  buildDemoTransferTransaction,
  DEMO_TRANSFER_LAMPORTS,
  getApiBaseUrl,
  sendSignedTransaction,
} from "./solana";

type Step = "connect" | "draft" | "analyze" | "review" | "sent";

interface Draft {
  transaction: Transaction;
  base64: string;
}

export function DemoApp() {
  const { connection } = useConnection();
  const { publicKey, connected, signTransaction } = useWallet();
  const [step, setStep] = useState<Step>("connect");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [report, setReport] = useState<TransactionAnalysisReport | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const client = useMemo(
    () => createSolanaGuardClient({ baseUrl: getApiBaseUrl() }),
    [],
  );

  useEffect(() => {
    if (!connected) {
      setStep("connect");
      setDraft(null);
      setReport(null);
      setReviewed(false);
      setSignature(null);
      return;
    }
    setStep((current) => (current === "connect" ? "draft" : current));
  }, [connected]);

  const resetFlow = useCallback(() => {
    setDraft(null);
    setReport(null);
    setReviewed(false);
    setError(null);
    setSignature(null);
    setStep(connected ? "draft" : "connect");
  }, [connected]);

  const draftTransaction = useCallback(async () => {
    if (!publicKey) {
      setError("Connect a Devnet wallet first.");
      return;
    }
    setBusy(true);
    setError(null);
    setReport(null);
    setReviewed(false);
    setSignature(null);
    try {
      const next = await buildDemoTransferTransaction(connection, publicKey);
      setDraft(next);
      setStep("analyze");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not draft transaction.");
    } finally {
      setBusy(false);
    }
  }, [connection, publicKey]);

  const analyzeDraft = useCallback(async () => {
    if (!draft) {
      setError("Draft a transaction before analyzing.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await client.analyzeTransaction({
        base64: draft.base64,
        includeSimulation: true,
      });
      setReport(next);
      setStep("review");
    } catch (err) {
      if (err instanceof SolanaGuardApiError || err instanceof SolanaGuardNetworkError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Analysis failed.");
      }
    } finally {
      setBusy(false);
    }
  }, [client, draft]);

  const signAndSend = useCallback(async () => {
    if (!signTransaction || !draft || !reviewed || !report) {
      setError("Review the SolanaGuard report and confirm before signing.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Sign the same drafted message that was analyzed — never auto-sign.
      const signed = await signTransaction(draft.transaction);
      const sig = await sendSignedTransaction(connection, signed);
      setSignature(sig);
      setStep("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign/send was cancelled or failed.");
    } finally {
      setBusy(false);
    }
  }, [connection, draft, report, reviewed, signTransaction]);

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">Development / test environment · Devnet only</p>
        <h1>SolanaGuard</h1>
        <p className="lede">
          Wallet integration demo: draft a tiny self-transfer, analyze it, review the report, then
          explicitly choose to sign. Nothing is auto-signed.
        </p>
      </header>

      <aside className="banner">
        <strong>Not a safety verdict.</strong> SolanaGuard reports are observational. This demo never
        asks for seed phrases or private keys. Mainnet is refused.
      </aside>

      <section className="panel">
        <div className="row">
          <WalletMultiButton />
          <button type="button" className="ghost" onClick={resetFlow} disabled={busy}>
            Reset flow
          </button>
        </div>
        <p className="meta">
          API: <code>{getApiBaseUrl()}</code> · RPC: <code>{connection.rpcEndpoint}</code>
        </p>
        {!connected ? (
          <p className="hint">Connect a wallet configured for Devnet to continue.</p>
        ) : (
          <p className="hint">
            Connected. Demo transfer amount: {DEMO_TRANSFER_LAMPORTS} lamports to self (plus fees).
            You need a small Devnet SOL balance.
          </p>
        )}
      </section>

      <ol className="steps">
        <li className={connected ? "done" : "active"}>
          <h2>1. Connect wallet</h2>
          <p>Use Wallet Standard wallets (for example Phantom) on Devnet. Auto-connect is off.</p>
        </li>
        <li
          className={
            step === "analyze" || step === "review" || step === "sent"
              ? "done"
              : connected
                ? "active"
                : ""
          }
        >
          <h2>2. Draft Devnet test transaction</h2>
          <p>Builds an unsigned self-transfer. Signing is not requested yet.</p>
          <button type="button" onClick={() => void draftTransaction()} disabled={!connected || busy}>
            Draft transaction
          </button>
          {draft ? <pre className="code">{draft.base64.slice(0, 120)}…</pre> : null}
        </li>
        <li className={step === "review" || step === "sent" ? "done" : step === "analyze" ? "active" : ""}>
          <h2>3. Analyze with SolanaGuard</h2>
          <p>Sends the drafted wire bytes to the API. Requires the API on the configured origin.</p>
          <button type="button" onClick={() => void analyzeDraft()} disabled={!draft || busy}>
            Analyze draft
          </button>
        </li>
        <li className={step === "sent" ? "done" : step === "review" ? "active" : ""}>
          <h2>4. Review, then optionally sign</h2>
          <p>Signing stays disabled until you confirm you reviewed the report.</p>
          {report ? (
            <div className="report">
              <p>
                Score band: <strong>{report.score.band}</strong> ({report.score.total}/
                {report.score.cap})
              </p>
              <p className="muted">{report.score.note}</p>
              <p className="muted">{report.note}</p>
              <h3>Findings</h3>
              {report.evaluation.findings.length === 0 ? (
                <p className="muted">(none — empty findings are not a pass)</p>
              ) : (
                <ul>
                  {report.evaluation.findings.map((finding) => (
                    <li key={`${finding.ruleId}-${finding.title}`}>
                      <strong>{finding.severity}</strong> — {finding.title}
                      <div className="muted">{finding.explanation}</div>
                    </li>
                  ))}
                </ul>
              )}
              <h3>Simulation</h3>
              {report.simulation ? (
                <p>
                  success: {String(report.simulation.success)} ·{" "}
                  <span className="muted">{report.simulation.note}</span>
                </p>
              ) : (
                <p className="muted">Not run</p>
              )}
            </div>
          ) : (
            <p className="muted">No report yet.</p>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={reviewed}
              disabled={!report || busy}
              onChange={(event) => setReviewed(event.target.checked)}
            />
            I reviewed this SolanaGuard report and understand it is not a safety verdict.
          </label>
          <button
            type="button"
            className="danger"
            onClick={() => void signAndSend()}
            disabled={!report || !reviewed || !signTransaction || !draft || busy}
          >
            Sign and send on Devnet
          </button>
        </li>
        <li className={step === "sent" ? "active done" : ""}>
          <h2>5. Result</h2>
          {signature ? (
            <p>
              Submitted signature: <code>{signature}</code>
            </p>
          ) : (
            <p className="muted">No submission yet.</p>
          )}
        </li>
      </ol>

      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
