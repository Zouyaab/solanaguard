"use client";

export function JsonBlock({ value, title }: { value: unknown; title?: string }) {
  return (
    <section className="space-y-2">
      {title ? <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{title}</h3> : null}
      <pre className="overflow-x-auto border border-ink/10 bg-ink px-4 py-3 font-mono text-xs leading-relaxed text-mist">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}
