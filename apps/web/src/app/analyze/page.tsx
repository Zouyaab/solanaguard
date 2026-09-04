import { AnalyzeForm } from "@/components/AnalyzeForm";

export default function AnalyzePage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-ink">Analyze</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Submit base64 wire bytes or a confirmed signature. The dashboard calls the SolanaGuard
          API and renders the composed report.
        </p>
      </div>
      <AnalyzeForm />
    </main>
  );
}
