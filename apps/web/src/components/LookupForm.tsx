"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LookupForm({
  kind,
  label,
  placeholder,
}: {
  kind: "account" | "program" | "transaction";
  label: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    router.push(`/${kind}/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
      <label className="flex-1 space-y-1">
        <span className="text-sm font-medium text-ink-soft">{label}</span>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full border border-ink/15 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-tide"
          placeholder={placeholder}
        />
      </label>
      <button
        type="submit"
        className="mt-auto border border-tide-deep bg-tide px-4 py-2 text-sm font-semibold text-white"
      >
        Look up
      </button>
    </form>
  );
}
