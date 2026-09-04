import Link from "next/link";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";

export default function DocsPage() {
  return (
    <main className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-ink">Docs</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Short integration notes for the dashboard. Full repository docs live in the monorepo.
        </p>
      </div>
      <DisclaimerBanner />
      <section className="prose-like space-y-4 border border-ink/10 bg-foam/80 p-6 text-ink-soft">
        <h2 className="font-display text-2xl text-ink">How the dashboard works</h2>
        <p>
          The web app is a thin client. It uses <code className="font-mono">@solanaguard/sdk</code>{" "}
          to call the Fastify API. Start the API first (
          <code className="font-mono">pnpm dev</code>), then the dashboard (
          <code className="font-mono">pnpm --filter @solanaguard/web dev</code>).
        </p>
        <h2 className="font-display text-2xl text-ink">Pages</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <Link href="/analyze">/analyze</Link> — paste base64 or a signature
          </li>
          <li>
            <Link href="/account/11111111111111111111111111111111">/account/[address]</Link>
          </li>
          <li>
            <Link href="/program/11111111111111111111111111111111">/program/[programId]</Link>
          </li>
          <li>/transaction/[signature] — confirmed transaction fetch</li>
        </ul>
        <h2 className="font-display text-2xl text-ink">Repository docs</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>docs/api.md — REST + OpenAPI</li>
          <li>docs/sdk.md — TypeScript SDK</li>
          <li>docs/cli.md — CLI</li>
          <li>docs/limitations.md — honesty constraints</li>
        </ul>
      </section>
    </main>
  );
}
