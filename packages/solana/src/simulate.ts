import type {
  NormalizedSimulation,
  SimulatedAccountSnapshot,
  SimulatedInnerCompiled,
  SimulateTransactionOptions,
} from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function dataFromAccount(data: unknown): { dataBase64: string; dataLength: number } {
  if (Array.isArray(data) && typeof data[0] === "string") {
    const encoding = data[1] === "base64" || data[1] === undefined ? "base64" : "utf8";
    const bytes = Buffer.from(data[0], encoding);
    return { dataBase64: bytes.toString("base64"), dataLength: bytes.length };
  }
  if (typeof data === "string") {
    const bytes = Buffer.from(data, "base64");
    return { dataBase64: data, dataLength: bytes.length };
  }
  return { dataBase64: "", dataLength: 0 };
}

function indexList(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is number => typeof item === "number" && Number.isInteger(item));
}

function innerFromUnknown(
  value: unknown,
  accountKeys: readonly string[],
): SimulatedInnerCompiled[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: SimulatedInnerCompiled[] = [];
  for (const group of value) {
    const record = asRecord(group);
    if (!record) {
      continue;
    }
    const instructionIndex = asNumber(record.index) ?? asNumber(record.instructionIndex) ?? 0;
    const instructions = Array.isArray(record.instructions) ? record.instructions : [];
    for (const item of instructions) {
      const inner = asRecord(item);
      if (!inner) {
        continue;
      }
      const programIdIndex = asNumber(inner.programIdIndex) ?? 0;
      const programIdField = inner.programId;
      let programId: string | null = null;
      if (typeof programIdField === "string") {
        programId = programIdField;
      } else if (programIdField && typeof programIdField === "object" && "toBase58" in programIdField) {
        programId = String(
          (programIdField as { toBase58: () => string }).toBase58(),
        );
      } else if (accountKeys[programIdIndex]) {
        programId = accountKeys[programIdIndex] ?? null;
      }
      const data = inner.data;
      const dataBase64 = typeof data === "string" ? data : "";
      out.push({
        instructionIndex,
        programIdIndex,
        programId,
        accountIndexes: indexList(inner.accounts ?? inner.accountKeyIndexes),
        dataBase64,
      });
    }
  }
  return out;
}

function accountsFromUnknown(
  value: unknown,
  requested: readonly string[],
): SimulatedAccountSnapshot[] {
  if (!Array.isArray(value)) {
    return requested.map((address) => ({
      address,
      returned: false,
      lamports: null,
      owner: null,
      executable: null,
      dataLength: 0,
      dataBase64: null,
    }));
  }
  return requested.map((address, index) => {
    const item = value[index];
    if (item === null || item === undefined) {
      return {
        address,
        returned: false,
        lamports: null,
        owner: null,
        executable: null,
        dataLength: 0,
        dataBase64: null,
      };
    }
    const record = asRecord(item);
    if (!record) {
      return {
        address,
        returned: false,
        lamports: null,
        owner: null,
        executable: null,
        dataLength: 0,
        dataBase64: null,
      };
    }
    const encoded = dataFromAccount(record.data);
    return {
      address,
      returned: true,
      lamports: asNumber(record.lamports),
      owner: asString(record.owner),
      executable: asBoolean(record.executable),
      dataLength: encoded.dataLength,
      dataBase64: encoded.dataBase64,
    };
  });
}

function returnDataFromUnknown(value: unknown): { programId: string; dataBase64: string } | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  const programId =
    asString(record.programId) ??
    (record.programId && typeof record.programId === "object" && "toBase58" in record.programId
      ? String((record.programId as { toBase58: () => string }).toBase58())
      : null);
  if (!programId) {
    return null;
  }
  const data = record.data;
  let dataBase64 = "";
  if (Array.isArray(data) && typeof data[0] === "string") {
    dataBase64 = Buffer.from(data[0], data[1] === "base64" ? "base64" : "utf8").toString("base64");
  } else if (typeof data === "string") {
    dataBase64 = data;
  }
  return { programId, dataBase64 };
}

function replacementBlockhash(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  const record = asRecord(value);
  return record ? asString(record.blockhash) : null;
}

/**
 * Map a raw `simulateTransaction` RPC payload into NormalizedSimulation.
 * Pure: no network I/O.
 */
export function normalizeSimulateRpcResult(input: {
  contextSlot: number | null;
  value: unknown;
  options?: SimulateTransactionOptions;
  sigVerify?: boolean;
  replaceRecentBlockhash?: boolean;
}): NormalizedSimulation {
  const requested = [...(input.options?.accounts ?? [])];
  const value = asRecord(input.value) ?? {};
  const logs = Array.isArray(value.logs)
    ? value.logs.filter((item): item is string => typeof item === "string")
    : [];
  const accountsRaw = value.accounts;
  const accountsReturned = Array.isArray(accountsRaw);
  return {
    available: true,
    success: value.err === null || value.err === undefined,
    error: value.err ?? null,
    logs,
    unitsConsumed: asNumber(value.unitsConsumed),
    contextSlot: input.contextSlot,
    replacementBlockhash: replacementBlockhash(value.replacementBlockhash),
    returnData: returnDataFromUnknown(value.returnData),
    innerInstructions: innerFromUnknown(value.innerInstructions, requested),
    accounts: accountsFromUnknown(accountsRaw, requested),
    accountsRequested: requested,
    accountsReturned,
    sigVerify: input.sigVerify === true,
    replaceRecentBlockhash: input.replaceRecentBlockhash !== false,
  };
}
