import Link from "next/link";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/analyze", label: "Analyze" },
  { href: "/docs", label: "Docs" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-ink/10 bg-foam/70 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-end justify-between gap-6 px-6 py-5">
        <div>
          <Link href="/" className="font-display text-3xl font-semibold tracking-tight text-ink no-underline">
            SolanaGuard
          </Link>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Transaction analysis for Solana developers — observational reports, not safety verdicts.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-ink-soft no-underline hover:text-tide">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
