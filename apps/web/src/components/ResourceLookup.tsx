"use client";

import { useEffect, useState } from "react";
import {
  SolanaGuardApiError,
  SolanaGuardNetworkError,
  SolanaGuardNotFoundError,
  type AccountLookupResponse,
  type ProgramLookupResponse,
  type TransactionLookupResponse,
} from "@solanaguard/sdk";
import { createWebClient } from "@/lib/api";
import { JsonBlock } from "./JsonBlock";
import { DisclaimerBanner } from "./DisclaimerBanner";

type Kind = "account" | "program" | "transaction";

export function ResourceLookup({ kind, id }: { kind: Kind; id: string }) {
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<
    AccountLookupResponse | ProgramLookupResponse | TransactionLookupResponse | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setBusy(true);
      setError(null);
      setData(null);
      try {
        const client = createWebClient();
        const next =
          kind === "account"
            ? await client.getAccount(id)
            : kind === "program"
              ? await client.getProgram(id)
              : await client.getTransaction(id);
        if (!cancelled) {
          setData(next);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (
          err instanceof SolanaGuardNotFoundError ||
          err instanceof SolanaGuardApiError ||
          err instanceof SolanaGuardNetworkError
        ) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Lookup failed.");
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  return (
    <div className="space-y-6">
      <DisclaimerBanner />
      <div className="border border-ink/10 bg-foam/80 p-6 shadow-panel">
        <p className="text-sm uppercase tracking-wide text-ink-muted">{kind}</p>
        <h1 className="mt-1 break-all font-mono text-lg text-ink">{id}</h1>
        {busy ? <p className="mt-4 text-sm text-ink-muted">Loading…</p> : null}
        {error ? <p className="mt-4 text-sm text-ember">{error}</p> : null}
        {data && "note" in data ? (
          <p className="mt-4 text-sm text-ink-muted">{data.note}</p>
        ) : null}
      </div>
      {data ? <JsonBlock title="Response" value={data} /> : null}
    </div>
  );
}
