import type { TransactionInput } from "@solanaguard/analyzer";

export type ParsedTxFlags =
  | { ok: true; input: TransactionInput; includeSimulation: boolean; json: boolean }
  | { ok: false; usage: string };

/**
 * Parse `--base64` / `--signature` / optional positional base64, plus shared flags.
 * `--json` requests machine-readable output where a command supports it.
 * `--no-simulation` skips simulate/compare for analyze.
 */
export function parseTransactionArgs(
  argv: readonly string[],
  usage: string,
): ParsedTxFlags {
  let base64: string | undefined;
  let signature: string | undefined;
  let includeSimulation = true;
  let json = false;
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === undefined) {
      continue;
    }
    if (token === "--json") {
      json = true;
      continue;
    }
    if (token === "--no-simulation") {
      includeSimulation = false;
      continue;
    }
    if (token === "--base64") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        return { ok: false, usage };
      }
      base64 = value;
      i += 1;
      continue;
    }
    if (token === "--signature") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        return { ok: false, usage };
      }
      signature = value;
      i += 1;
      continue;
    }
    if (token.startsWith("-")) {
      return { ok: false, usage };
    }
    positionals.push(token);
  }

  if (base64 && signature) {
    return { ok: false, usage };
  }
  if (!base64 && !signature && positionals.length === 1) {
    base64 = positionals[0];
  } else if (positionals.length > 0 && (base64 || signature)) {
    return { ok: false, usage };
  } else if (positionals.length > 1) {
    return { ok: false, usage };
  }

  if (base64) {
    return {
      ok: true,
      input: { source: "base64", base64 },
      includeSimulation,
      json,
    };
  }
  if (signature) {
    return {
      ok: true,
      input: { source: "signature", signature },
      includeSimulation,
      json,
    };
  }
  return { ok: false, usage };
}
