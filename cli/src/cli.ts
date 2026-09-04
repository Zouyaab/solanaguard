import { loadConfig } from "@solanaguard/config";
import {
  analyzeTransaction,
  classifyAddress,
  compareNormalizedTransaction,
  normalizeTransaction,
  simulateNormalizedTransaction,
  TransactionNotFoundError,
  type TransactionInput,
} from "@solanaguard/analyzer";
import { evaluateAndScore, evaluateRules } from "@solanaguard/risk-engine";
import {
  createSolanaRpc,
  InvalidAddressError,
  InvalidTransactionError,
  type SolanaRpc,
} from "@solanaguard/solana";
import { SOLANAGUARD_NAME, SOLANAGUARD_VERSION } from "@solanaguard/types";
import { parseTransactionArgs } from "./flags.js";
import { formatAnalysisReport } from "./report.js";

export interface CliResult {
  stdout: string;
  exitCode: number;
}

function rpcClient(): SolanaRpc {
  return createSolanaRpc(loadConfig());
}

function fail(message: string, exitCode = 1): CliResult {
  return { stdout: message.endsWith("\n") ? message : `${message}\n`, exitCode };
}

function okJson(value: unknown): CliResult {
  return { stdout: `${JSON.stringify(value, null, 2)}\n`, exitCode: 0 };
}

function mapTxError(error: unknown): CliResult {
  if (error instanceof TransactionNotFoundError) {
    return fail(error.message, 2);
  }
  if (error instanceof InvalidTransactionError || error instanceof InvalidAddressError) {
    return fail(error.message, 1);
  }
  const message = error instanceof Error ? error.message : String(error);
  return fail(message, 1);
}

async function withTransactionInput(
  argv: readonly string[],
  usage: string,
  run: (input: TransactionInput, flags: { includeSimulation: boolean; json: boolean }) => Promise<CliResult>,
): Promise<CliResult> {
  const parsed = parseTransactionArgs(argv, usage);
  if (!parsed.ok) {
    return fail(parsed.usage);
  }
  try {
    return await run(parsed.input, {
      includeSimulation: parsed.includeSimulation,
      json: parsed.json,
    });
  } catch (error) {
    return mapTxError(error);
  }
}

export async function runCli(argv: readonly string[]): Promise<CliResult> {
  const command = argv[0];

  if (command === "--version" || command === "-v") {
    return { stdout: `${SOLANAGUARD_VERSION}\n`, exitCode: 0 };
  }

  if (command === "rpc-status") {
    try {
      const status = await rpcClient().getStatus();
      return {
        stdout: `${JSON.stringify(status, null, 2)}\n`,
        exitCode: status.reachable ? 0 : 2,
      };
    } catch (error) {
      return mapTxError(error);
    }
  }

  if (command === "account") {
    const address = argv[1];
    if (!address) {
      return fail("Usage: solanaguard account <ADDRESS>");
    }
    try {
      const account = await rpcClient().getAccount(address);
      if (!account) {
        return fail(`No account at ${address} on the configured cluster.`, 2);
      }
      const curve = classifyAddress(account.address);
      return okJson({
        ...account,
        lamports: account.lamports.toString(),
        rentEpoch: account.rentEpoch?.toString() ?? null,
        onCurve: curve.onCurve,
        curveClass: curve.curveClass,
      });
    } catch (error) {
      return mapTxError(error);
    }
  }

  if (command === "program") {
    const programId = argv[1];
    if (!programId) {
      return fail("Usage: solanaguard program <PROGRAM_ID>");
    }
    try {
      const account = await rpcClient().getAccount(programId);
      if (!account) {
        return fail(`No account at ${programId} on the configured cluster.`, 2);
      }
      const curve = classifyAddress(account.address);
      return okJson({
        found: true,
        programId,
        executable: account.executable,
        account: {
          ...account,
          lamports: account.lamports.toString(),
          rentEpoch: account.rentEpoch?.toString() ?? null,
          onCurve: curve.onCurve,
          curveClass: curve.curveClass,
        },
        note: account.executable
          ? "Account is marked executable on this cluster. That is not a safety verdict."
          : "Account exists but is not marked executable on this cluster. That is incomplete program coverage, not evidence of malice.",
      });
    } catch (error) {
      return mapTxError(error);
    }
  }

  if (command === "transaction") {
    const signature = argv[1];
    if (!signature) {
      return fail("Usage: solanaguard transaction <SIGNATURE>");
    }
    try {
      const transaction = await rpcClient().getTransaction(signature);
      if (!transaction) {
        return fail(
          `No confirmed transaction with signature ${signature} on the configured cluster.`,
          2,
        );
      }
      return okJson({ found: true, transaction });
    } catch (error) {
      return mapTxError(error);
    }
  }

  if (command === "normalize") {
    return withTransactionInput(
      argv.slice(1),
      "Usage: solanaguard normalize --base64 <TX> | --signature <SIGNATURE> | <BASE64>\n",
      async (input) => {
        const transaction = await normalizeTransaction(input, { rpc: rpcClient() });
        return okJson(transaction);
      },
    );
  }

  if (command === "rules") {
    return withTransactionInput(
      argv.slice(1),
      "Usage: solanaguard rules --base64 <TX> | --signature <SIGNATURE> | <BASE64>\n",
      async (input) => {
        const transaction = await normalizeTransaction(input, { rpc: rpcClient() });
        return okJson({ transaction, evaluation: evaluateRules(transaction) });
      },
    );
  }

  if (command === "score") {
    return withTransactionInput(
      argv.slice(1),
      "Usage: solanaguard score --base64 <TX> | --signature <SIGNATURE> | <BASE64>\n",
      async (input) => {
        const transaction = await normalizeTransaction(input, { rpc: rpcClient() });
        const { evaluation, score } = evaluateAndScore(transaction);
        return okJson({ transaction, evaluation, score });
      },
    );
  }

  if (command === "simulate") {
    return withTransactionInput(
      argv.slice(1),
      "Usage: solanaguard simulate --base64 <TX> | --signature <SIGNATURE> | <BASE64>\n",
      async (input) => {
        const result = await simulateNormalizedTransaction(input, { rpc: rpcClient() });
        return okJson(result);
      },
    );
  }

  if (command === "compare") {
    return withTransactionInput(
      argv.slice(1),
      "Usage: solanaguard compare --base64 <TX> | --signature <SIGNATURE> | <BASE64>\n",
      async (input) => {
        const result = await compareNormalizedTransaction(input, { rpc: rpcClient() });
        return okJson(result);
      },
    );
  }

  if (command === "analyze") {
    return withTransactionInput(
      argv.slice(1),
      "Usage: solanaguard analyze [--json] [--no-simulation] --base64 <TX> | --signature <SIGNATURE> | <BASE64>\n",
      async (input, flags) => {
        const analyzeOptions: {
          rpc: SolanaRpc;
          includeSimulation?: boolean;
        } = { rpc: rpcClient() };
        if (!flags.includeSimulation) {
          analyzeOptions.includeSimulation = false;
        }
        const report = await analyzeTransaction(input, analyzeOptions);
        if (flags.json) {
          return okJson(report);
        }
        return { stdout: formatAnalysisReport(report), exitCode: 0 };
      },
    );
  }

  const help = `${SOLANAGUARD_NAME} ${SOLANAGUARD_VERSION}

Developer CLI against the configured Solana RPC.
Reports are not a safety verdict.

Commands:
  solanaguard --version
  solanaguard rpc-status
  solanaguard account <ADDRESS>
  solanaguard program <PROGRAM_ID>
  solanaguard transaction <SIGNATURE>
  solanaguard normalize --base64 <TX> | --signature <SIGNATURE> | <BASE64>
  solanaguard rules --base64 <TX> | --signature <SIGNATURE> | <BASE64>
  solanaguard score --base64 <TX> | --signature <SIGNATURE> | <BASE64>
  solanaguard simulate --base64 <TX> | --signature <SIGNATURE> | <BASE64>
  solanaguard compare --base64 <TX> | --signature <SIGNATURE> | <BASE64>
  solanaguard analyze [--json] [--no-simulation] --base64 <TX> | --signature <SIGNATURE> | <BASE64>

Related surfaces (not this binary):
  Web dashboard: pnpm dev:web
  Wallet demo:   pnpm dev:demo
  Docs index:    docs/README.md
`;

  return { stdout: help, exitCode: 0 };
}
