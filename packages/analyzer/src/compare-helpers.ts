import type {
  BehaviorComparison,
  ComparisonObservation,
  NormalizedCompiledInstruction,
  ResolvedAccountSnapshot,
  SimulatedAccountView,
} from "@solanaguard/types";

export function namedAddress(
  instruction: NormalizedCompiledInstruction,
  name: string,
): string | null {
  return instruction.namedAccounts.find((account) => account.name === name)?.address ?? null;
}

export function asAmountString(value: unknown): string | null {
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return null;
}

export function parseAmount(value: string | null | undefined): bigint | null {
  if (value === null || value === undefined || !/^-?\d+$/.test(value)) {
    return null;
  }
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export function obs(
  partial: Omit<ComparisonObservation, "evidence"> & {
    evidence?: ComparisonObservation["evidence"];
  },
): ComparisonObservation {
  return { ...partial, evidence: partial.evidence ?? {} };
}

export function summarize(
  observations: readonly ComparisonObservation[],
): BehaviorComparison["summary"] {
  const summary = { matched: 0, diverged: 0, incomplete: 0, notApplicable: 0 };
  for (const item of observations) {
    if (item.status === "matched") summary.matched += 1;
    else if (item.status === "diverged") summary.diverged += 1;
    else if (item.status === "incomplete") summary.incomplete += 1;
    else summary.notApplicable += 1;
  }
  return summary;
}

export function preLamports(
  snapshots: readonly ResolvedAccountSnapshot[],
  address: string,
): bigint | null {
  const snapshot = snapshots.find((item) => item.address === address);
  if (!snapshot || snapshot.presence !== "found") {
    return null;
  }
  return parseAmount(snapshot.lamports);
}

export function postAccount(
  accounts: readonly SimulatedAccountView[],
  address: string,
): SimulatedAccountView | undefined {
  return accounts.find((item) => item.address === address);
}
