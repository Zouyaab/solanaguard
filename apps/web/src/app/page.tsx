import Link from "next/link";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { LookupForm } from "@/components/LookupForm";
import { getApiBaseUrl } from "@/lib/api";

export default function HomePage() {
  const apiBase = getApiBaseUrl();

  return (
    <main className="space-y-12">
      <section className="space-y-5">
        <p className="text-sm uppercase tracking-[0.18em] text-tide-deep">Developer dashboard</p>
        <h1 className="max-w-3xl font-display text-5xl leading-tight text-ink md:text-6xl">
          SolanaGuard
        </h1>
        <p className="max-w-2xl text-lg text-ink-soft">
          Paste a transaction, inspect accounts and programs, and read an explainable analysis
          report before anyone signs.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/analyze"
            className="border border-tide-deep bg-tide px-5 py-2.5 text-sm font-semibold text-white no-underline hover:bg-tide-deep"
          >
            Analyze a transaction
          </Link>
          <Link
            href="/docs"
            className="border border-ink/20 bg-foam px-5 py-2.5 text-sm font-semibold text-ink no-underline hover:border-tide"
          >
            Read the docs
          </Link>
        </div>
      </section>

      <DisclaimerBanner />

      <section className="grid gap-6 md:grid-cols-3">
        <div className="border border-ink/10 bg-foam/80 p-5">
          <h2 className="font-display text-xl text-ink">Analyze</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Normalize, score, simulate, and compare through the running API.
          </p>
          <Link href="/analyze" className="mt-4 inline-block text-sm font-medium">
            Open analyzer
          </Link>
        </div>
        <div className="border border-ink/10 bg-foam/80 p-5">
          <h2 className="font-display text-xl text-ink">Lookups</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Fetch account, program, or confirmed transaction data from the cluster via the API.
          </p>
        </div>
        <div className="border border-ink/10 bg-foam/80 p-5">
          <h2 className="font-display text-xl text-ink">API target</h2>
          <p className="mt-2 break-all font-mono text-xs text-ink-soft">{apiBase}</p>
          <p className="mt-2 text-sm text-ink-muted">
            Set <code className="font-mono">NEXT_PUBLIC_SOLANAGUARD_API_URL</code> if needed.
          </p>
        </div>
      </section>

      <section className="space-y-6 border border-ink/10 bg-foam/80 p-6 shadow-panel">
        <h2 className="font-display text-2xl text-ink">Quick lookup</h2>
        <LookupForm kind="account" label="Account address" placeholder="Base58 address" />
        <LookupForm kind="program" label="Program id" placeholder="Base58 program id" />
        <LookupForm kind="transaction" label="Transaction signature" placeholder="Base58 signature" />
      </section>
    </main>
  );
}
