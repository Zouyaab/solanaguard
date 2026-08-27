import { AddressLookupTableAccount } from "@solana/web3.js";
import {
  RpcRequestError,
  type NormalizedAccount,
  type SolanaRpc,
  type TransactionWire,
} from "@solanaguard/solana";
import type {
  AccountResolutionSummary,
  NormalizedAddressTableLookup,
  NormalizedTransaction,
  ResolvedAccountSnapshot,
} from "@solanaguard/types";
import { classifyAddress } from "./classify.js";

export const LOOKUP_TABLES_UNREADABLE_NOTE =
  "Address lookup tables could not be loaded from RPC (missing or unreadable table account). That is incomplete data, not a risk finding.";

export const ACCOUNT_RESOLUTION_SKIPPED_NOTE =
  "On-chain account resolution was skipped because no RPC client was provided. Missing cluster data is not a risk finding.";

export function snapshotFromAccount(
  address: string,
  account: NormalizedAccount | null,
): ResolvedAccountSnapshot {
  const curve = classifyAddress(address);
  if (!account) {
    return {
      address,
      presence: "not_found",
      lamports: null,
      owner: null,
      executable: null,
      dataLength: null,
      ...curve,
    };
  }
  return {
    address,
    presence: "found",
    lamports: account.lamports.toString(),
    owner: account.owner,
    executable: account.executable,
    dataLength: account.dataLength,
    ...curve,
  };
}

function uniqueAddresses(transaction: NormalizedTransaction): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of transaction.accountKeys) {
    if (!seen.has(key.address)) {
      seen.add(key.address);
      out.push(key.address);
    }
  }
  for (const lookup of transaction.addressTableLookups) {
    if (!seen.has(lookup.accountKey)) {
      seen.add(lookup.accountKey);
      out.push(lookup.accountKey);
    }
  }
  return out;
}

function summaryOf(snapshots: ResolvedAccountSnapshot[]): AccountResolutionSummary {
  const found = snapshots.filter((item) => item.presence === "found").length;
  return {
    attempted: true,
    found,
    notFound: snapshots.length - found,
  };
}

function resolutionNotes(summary: AccountResolutionSummary): string[] {
  return [
    `${summary.found} of ${summary.found + summary.notFound} unique account(s) found on the cluster. Not found is not a risk finding. Account resolution is not a risk assessment.`,
  ];
}

export async function resolveLookupAddresses(
  rpc: SolanaRpc,
  lookups: readonly NormalizedAddressTableLookup[],
): Promise<{
  loadedAddresses: NonNullable<TransactionWire["loadedAddresses"]> | null;
  notes: string[];
}> {
  if (lookups.length === 0) {
    return { loadedAddresses: null, notes: [] };
  }

  const tableKeys = [...new Set(lookups.map((lookup) => lookup.accountKey))];
  const accounts = await rpc.getMultipleAccounts(tableKeys);
  if (accounts.length !== tableKeys.length) {
    throw new RpcRequestError(
      "getMultipleAccounts",
      new Error("RPC returned a different number of accounts than requested."),
    );
  }

  const byKey = new Map<string, NormalizedAccount | null>();
  for (let i = 0; i < tableKeys.length; i += 1) {
    const key = tableKeys[i];
    if (key !== undefined) {
      byKey.set(key, accounts[i] ?? null);
    }
  }

  const writable: string[] = [];
  const readonly: string[] = [];

  for (const lookup of lookups) {
    const account = byKey.get(lookup.accountKey);
    if (!account) {
      return { loadedAddresses: null, notes: [LOOKUP_TABLES_UNREADABLE_NOTE] };
    }
    let state: ReturnType<typeof AddressLookupTableAccount.deserialize>;
    try {
      state = AddressLookupTableAccount.deserialize(
        Uint8Array.from(Buffer.from(account.dataBase64, "base64")),
      );
    } catch {
      return { loadedAddresses: null, notes: [LOOKUP_TABLES_UNREADABLE_NOTE] };
    }

    for (const index of lookup.writableIndexes) {
      const address = state.addresses[index];
      if (!address) {
        return { loadedAddresses: null, notes: [LOOKUP_TABLES_UNREADABLE_NOTE] };
      }
      writable.push(address.toBase58());
    }
    for (const index of lookup.readonlyIndexes) {
      const address = state.addresses[index];
      if (!address) {
        return { loadedAddresses: null, notes: [LOOKUP_TABLES_UNREADABLE_NOTE] };
      }
      readonly.push(address.toBase58());
    }
  }

  return { loadedAddresses: { writable, readonly }, notes: [] };
}

export async function attachResolvedAccounts(
  transaction: NormalizedTransaction,
  rpc: SolanaRpc,
  extraNotes: readonly string[] = [],
): Promise<NormalizedTransaction> {
  const addresses = uniqueAddresses(transaction);
  const accounts = await rpc.getMultipleAccounts(addresses);
  if (accounts.length !== addresses.length) {
    throw new RpcRequestError(
      "getMultipleAccounts",
      new Error("RPC returned a different number of accounts than requested."),
    );
  }
  const resolvedAccounts = addresses.map((address, index) =>
    snapshotFromAccount(address, accounts[index] ?? null),
  );
  const accountResolution = summaryOf(resolvedAccounts);
  return {
    ...transaction,
    resolvedAccounts,
    accountResolution,
    notes: [...transaction.notes, ...extraNotes, ...resolutionNotes(accountResolution)],
  };
}

export function withSkippedAccountResolution(
  transaction: NormalizedTransaction,
): NormalizedTransaction {
  return {
    ...transaction,
    notes: [...transaction.notes, ACCOUNT_RESOLUTION_SKIPPED_NOTE],
  };
}
