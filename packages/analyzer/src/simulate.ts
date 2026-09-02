import { InvalidTransactionError, type SolanaRpc } from "@solanaguard/solana";
import type { NormalizedTransaction, SimulationReport } from "@solanaguard/types";
import { TransactionNotFoundError } from "./errors.js";
import {
  normalizeTransaction,
  transactionBytesFromInput,
  type LocalTransactionInput,
  type NormalizeOptions,
  type TransactionInput,
} from "./normalize.js";
import type { InstructionDecoderPlugin } from "./decode/plugin.js";

export const SIMULATION_NOTE =
  "Simulation is a cluster preview with replaceRecentBlockhash and without signature verification. " +
  "It can differ from later execution (slot, blockhash, competing transactions, program upgrades). " +
  "A successful simulation is not a safety verdict and not a security guarantee.";

export interface SimulateOptions {
  rpc: SolanaRpc;
  plugins?: readonly InstructionDecoderPlugin[];
}

export interface SimulatedTransactionView {
  transaction: NormalizedTransaction;
  simulation: SimulationReport;
}

function uniqueAccountKeys(transaction: NormalizedTransaction): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of transaction.accountKeys) {
    if (seen.has(key.address)) {
      continue;
    }
    seen.add(key.address);
    out.push(key.address);
  }
  return out;
}

function toReport(
  transaction: NormalizedTransaction,
  raw: Awaited<ReturnType<SolanaRpc["simulateTransaction"]>>,
): SimulationReport {
  return {
    success: raw.success,
    error: raw.error,
    logs: raw.logs,
    unitsConsumed: raw.unitsConsumed,
    contextSlot: raw.contextSlot,
    replacementBlockhash: raw.replacementBlockhash,
    returnData: raw.returnData,
    innerInstructions: raw.innerInstructions.map((item) => ({
      instructionIndex: item.instructionIndex,
      programIdIndex: item.programIdIndex,
      programId: item.programId ?? transaction.accountKeys[item.programIdIndex]?.address ?? null,
      accountIndexes: item.accountIndexes,
      dataBase64: item.dataBase64,
    })),
    accounts: raw.accounts.map((account) => ({
      address: account.address,
      returned: account.returned,
      lamports: account.lamports === null ? null : String(account.lamports),
      owner: account.owner,
      executable: account.executable,
      dataLength: account.dataLength,
      dataBase64: account.dataBase64,
    })),
    accountsRequested: raw.accountsRequested,
    accountsReturned: raw.accountsReturned,
    sigVerify: raw.sigVerify,
    replaceRecentBlockhash: raw.replaceRecentBlockhash,
    lookupsUnresolved: transaction.lookupsUnresolved,
    note: SIMULATION_NOTE,
  };
}

async function bytesForInput(input: TransactionInput, rpc: SolanaRpc): Promise<Uint8Array> {
  if (typeof input === "object" && !(input instanceof Uint8Array) && input.source === "signature") {
    const wire = await rpc.getTransactionWire(input.signature);
    if (!wire) {
      throw new TransactionNotFoundError(input.signature);
    }
    return wire.bytes;
  }
  return transactionBytesFromInput(input as LocalTransactionInput);
}

/**
 * Normalize a transaction, then simulate it on the configured cluster.
 * Requires RPC. For expected-vs-simulated observations, use compareNormalizedTransaction.
 */
export async function simulateNormalizedTransaction(
  input: TransactionInput,
  options: SimulateOptions,
): Promise<SimulatedTransactionView> {
  if (!options.rpc) {
    throw new InvalidTransactionError("A Solana RPC client is required to simulate a transaction.");
  }
  const normalizeOptions: NormalizeOptions = {
    rpc: options.rpc,
    ...(options.plugins ? { plugins: options.plugins } : {}),
  };
  const transaction = await normalizeTransaction(input, normalizeOptions);
  const accounts = uniqueAccountKeys(transaction);
  const bytes = await bytesForInput(input, options.rpc);
  const raw = await options.rpc.simulateTransaction(bytes, { accounts });
  return {
    transaction,
    simulation: toReport(transaction, raw),
  };
}
