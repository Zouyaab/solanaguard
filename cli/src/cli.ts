import { loadConfig } from "@solanaguard/config";
import {
  classifyAddress,
  compareNormalizedTransaction,
  normalizeTransaction,
  simulateNormalizedTransaction,
  TransactionNotFoundError,
} from "@solanaguard/analyzer";
import { evaluateAndScore, evaluateRules } from "@solanaguard/risk-engine";
import { createSolanaRpc, InvalidAddressError, InvalidTransactionError } from "@solanaguard/solana";
import { SOLANAGUARD_NAME, SOLANAGUARD_VERSION } from "@solanaguard/types";

export interface CliResult {
  stdout: string;
  exitCode: number;
}

export async function runCli(argv: readonly string[]): Promise<CliResult> {
  const command = argv[0];

  if (command === "--version" || command === "-v") {
    return { stdout: `${SOLANAGUARD_VERSION}\n`, exitCode: 0 };
  }

  if (command === "rpc-status") {
    try {
      const rpc = createSolanaRpc(loadConfig());
      const status = await rpc.getStatus();
      return { stdout: `${JSON.stringify(status, null, 2)}\n`, exitCode: status.reachable ? 0 : 2 };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { stdout: `${message}\n`, exitCode: 1 };
    }
  }

  if (command === "account") {
    const address = argv[1];
    if (!address) {
      return { stdout: "Usage: solanaguard account <ADDRESS>\n", exitCode: 1 };
    }
    try {
      const rpc = createSolanaRpc(loadConfig());
      const account = await rpc.getAccount(address);
      if (!account) {
        return {
          stdout: `No account at ${address} on the configured cluster.\n`,
          exitCode: 2,
        };
      }
      const curve = classifyAddress(account.address);
      const json = {
        ...account,
        lamports: account.lamports.toString(),
        rentEpoch: account.rentEpoch?.toString() ?? null,
        onCurve: curve.onCurve,
        curveClass: curve.curveClass,
      };
      return { stdout: `${JSON.stringify(json, null, 2)}\n`, exitCode: 0 };
    } catch (error) {
      if (error instanceof InvalidAddressError) {
        return { stdout: `${error.message}\n`, exitCode: 1 };
      }
      const message = error instanceof Error ? error.message : String(error);
      return { stdout: `${message}\n`, exitCode: 1 };
    }
  }

  if (command === "normalize") {
    const flag = argv[1];
    const value = argv[2];
    if (flag === "--base64" && value) {
      try {
        const rpc = createSolanaRpc(loadConfig());
        const transaction = await normalizeTransaction(
          { source: "base64", base64: value },
          { rpc },
        );
        return { stdout: `${JSON.stringify(transaction, null, 2)}\n`, exitCode: 0 };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { stdout: `${message}\n`, exitCode: 1 };
      }
    }
    if (flag === "--signature" && value) {
      try {
        const rpc = createSolanaRpc(loadConfig());
        const transaction = await normalizeTransaction(
          { source: "signature", signature: value },
          { rpc },
        );
        return { stdout: `${JSON.stringify(transaction, null, 2)}\n`, exitCode: 0 };
      } catch (error) {
        if (error instanceof TransactionNotFoundError) {
          return { stdout: `${error.message}\n`, exitCode: 2 };
        }
        if (error instanceof InvalidTransactionError) {
          return { stdout: `${error.message}\n`, exitCode: 1 };
        }
        const message = error instanceof Error ? error.message : String(error);
        return { stdout: `${message}\n`, exitCode: 1 };
      }
    }
    return {
      stdout: "Usage: solanaguard normalize --base64 <TX> | --signature <SIGNATURE>\n",
      exitCode: 1,
    };
  }

  if (command === "rules") {
    const flag = argv[1];
    const value = argv[2];
    if (flag === "--base64" && value) {
      try {
        const rpc = createSolanaRpc(loadConfig());
        const transaction = await normalizeTransaction(
          { source: "base64", base64: value },
          { rpc },
        );
        const evaluation = evaluateRules(transaction);
        return { stdout: `${JSON.stringify({ transaction, evaluation }, null, 2)}\n`, exitCode: 0 };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { stdout: `${message}\n`, exitCode: 1 };
      }
    }
    if (flag === "--signature" && value) {
      try {
        const rpc = createSolanaRpc(loadConfig());
        const transaction = await normalizeTransaction(
          { source: "signature", signature: value },
          { rpc },
        );
        const evaluation = evaluateRules(transaction);
        return { stdout: `${JSON.stringify({ transaction, evaluation }, null, 2)}\n`, exitCode: 0 };
      } catch (error) {
        if (error instanceof TransactionNotFoundError) {
          return { stdout: `${error.message}\n`, exitCode: 2 };
        }
        if (error instanceof InvalidTransactionError) {
          return { stdout: `${error.message}\n`, exitCode: 1 };
        }
        const message = error instanceof Error ? error.message : String(error);
        return { stdout: `${message}\n`, exitCode: 1 };
      }
    }
    return {
      stdout: "Usage: solanaguard rules --base64 <TX> | --signature <SIGNATURE>\n",
      exitCode: 1,
    };
  }

  if (command === "score") {
    const flag = argv[1];
    const value = argv[2];
    if (flag === "--base64" && value) {
      try {
        const rpc = createSolanaRpc(loadConfig());
        const transaction = await normalizeTransaction(
          { source: "base64", base64: value },
          { rpc },
        );
        const { evaluation, score } = evaluateAndScore(transaction);
        return {
          stdout: `${JSON.stringify({ transaction, evaluation, score }, null, 2)}\n`,
          exitCode: 0,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { stdout: `${message}\n`, exitCode: 1 };
      }
    }
    if (flag === "--signature" && value) {
      try {
        const rpc = createSolanaRpc(loadConfig());
        const transaction = await normalizeTransaction(
          { source: "signature", signature: value },
          { rpc },
        );
        const { evaluation, score } = evaluateAndScore(transaction);
        return {
          stdout: `${JSON.stringify({ transaction, evaluation, score }, null, 2)}\n`,
          exitCode: 0,
        };
      } catch (error) {
        if (error instanceof TransactionNotFoundError) {
          return { stdout: `${error.message}\n`, exitCode: 2 };
        }
        if (error instanceof InvalidTransactionError) {
          return { stdout: `${error.message}\n`, exitCode: 1 };
        }
        const message = error instanceof Error ? error.message : String(error);
        return { stdout: `${message}\n`, exitCode: 1 };
      }
    }
    return {
      stdout: "Usage: solanaguard score --base64 <TX> | --signature <SIGNATURE>\n",
      exitCode: 1,
    };
  }

  if (command === "simulate") {
    const flag = argv[1];
    const value = argv[2];
    if (flag === "--base64" && value) {
      try {
        const rpc = createSolanaRpc(loadConfig());
        const result = await simulateNormalizedTransaction(
          { source: "base64", base64: value },
          { rpc },
        );
        return { stdout: `${JSON.stringify(result, null, 2)}\n`, exitCode: 0 };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { stdout: `${message}\n`, exitCode: 1 };
      }
    }
    if (flag === "--signature" && value) {
      try {
        const rpc = createSolanaRpc(loadConfig());
        const result = await simulateNormalizedTransaction(
          { source: "signature", signature: value },
          { rpc },
        );
        return { stdout: `${JSON.stringify(result, null, 2)}\n`, exitCode: 0 };
      } catch (error) {
        if (error instanceof TransactionNotFoundError) {
          return { stdout: `${error.message}\n`, exitCode: 2 };
        }
        if (error instanceof InvalidTransactionError) {
          return { stdout: `${error.message}\n`, exitCode: 1 };
        }
        const message = error instanceof Error ? error.message : String(error);
        return { stdout: `${message}\n`, exitCode: 1 };
      }
    }
    return {
      stdout: "Usage: solanaguard simulate --base64 <TX> | --signature <SIGNATURE>\n",
      exitCode: 1,
    };
  }

  if (command === "compare") {
    const flag = argv[1];
    const value = argv[2];
    if (flag === "--base64" && value) {
      try {
        const rpc = createSolanaRpc(loadConfig());
        const result = await compareNormalizedTransaction(
          { source: "base64", base64: value },
          { rpc },
        );
        return { stdout: `${JSON.stringify(result, null, 2)}\n`, exitCode: 0 };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { stdout: `${message}\n`, exitCode: 1 };
      }
    }
    if (flag === "--signature" && value) {
      try {
        const rpc = createSolanaRpc(loadConfig());
        const result = await compareNormalizedTransaction(
          { source: "signature", signature: value },
          { rpc },
        );
        return { stdout: `${JSON.stringify(result, null, 2)}\n`, exitCode: 0 };
      } catch (error) {
        if (error instanceof TransactionNotFoundError) {
          return { stdout: `${error.message}\n`, exitCode: 2 };
        }
        if (error instanceof InvalidTransactionError) {
          return { stdout: `${error.message}\n`, exitCode: 1 };
        }
        const message = error instanceof Error ? error.message : String(error);
        return { stdout: `${message}\n`, exitCode: 1 };
      }
    }
    return {
      stdout: "Usage: solanaguard compare --base64 <TX> | --signature <SIGNATURE>\n",
      exitCode: 1,
    };
  }

  const help = `${SOLANAGUARD_NAME} ${SOLANAGUARD_VERSION}

Phase 10: normalize, decode, resolve, classify curve, evaluate rules, score findings,
simulate, and compare decoded expectations to the simulation preview.
Comparison observations are not a safety verdict.

Implemented:
  solanaguard --version
  solanaguard rpc-status
  solanaguard account <ADDRESS>
  solanaguard normalize --base64 <TX>
  solanaguard normalize --signature <SIGNATURE>
  solanaguard rules --base64 <TX>
  solanaguard rules --signature <SIGNATURE>
  solanaguard score --base64 <TX>
  solanaguard score --signature <SIGNATURE>
  solanaguard simulate --base64 <TX>
  solanaguard simulate --signature <SIGNATURE>
  solanaguard compare --base64 <TX>
  solanaguard compare --signature <SIGNATURE>

Not implemented yet:
  analyze / program
`;

  return { stdout: help, exitCode: 0 };
}
