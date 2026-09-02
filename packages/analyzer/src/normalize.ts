import {
  Transaction,
  VersionedTransaction,
  type MessageHeader,
  type VersionedMessage,
} from "@solana/web3.js";
import { TransactionNotFoundError } from "./errors.js";
import {
  InvalidTransactionError,
  encodeBase58,
  isAllZero,
  type SolanaRpc,
  type TransactionWire,
} from "@solanaguard/solana";
import {
  MAX_SOLANA_TRANSACTION_BYTES,
  type ConfirmedTransactionContext,
  type NormalizedAccountKey,
  type NormalizedAddressTableLookup,
  type NormalizedTransaction,
  type TransactionInputSource,
  type TransactionVersion,
} from "@solanaguard/types";
import { decodeInstructions, decodeSummaryNotes } from "./decode/apply.js";
import type { InstructionDecoderPlugin } from "./decode/plugin.js";
import {
  classifyAccountKey,
  curveClassificationNotes,
  summarizeCurveClassification,
} from "./classify.js";
import {
  attachResolvedAccounts,
  resolveLookupAddresses,
  withSkippedAccountResolution,
} from "./resolve.js";

export const LOOKUPS_UNRESOLVED_NOTE =
  "Address lookup tables are referenced but loaded addresses were not provided. That is incomplete data, not a risk finding.";

export type LocalTransactionInput =
  | Uint8Array
  | { source: "bytes"; bytes: Uint8Array }
  | { source: "base64"; base64: string }
  | { source: "versioned"; transaction: VersionedTransaction }
  | { source: "legacy"; transaction: Transaction };

export type TransactionInput = LocalTransactionInput | { source: "signature"; signature: string };

export interface NormalizeOptions {
  rpc?: SolanaRpc;
  plugins?: readonly InstructionDecoderPlugin[];
}

function staticKeys(message: VersionedMessage): { toBase58(): string }[] {
  const candidate = message as {
    staticAccountKeys?: { toBase58(): string }[];
    accountKeys?: { toBase58(): string }[];
  };
  return candidate.staticAccountKeys ?? candidate.accountKeys ?? [];
}

function messageVersion(message: VersionedMessage): TransactionVersion {
  if ("version" in message && message.version === 0) {
    return 0;
  }
  return "legacy";
}

function lookupsOf(message: VersionedMessage): NormalizedAddressTableLookup[] {
  const lookups = "addressTableLookups" in message ? message.addressTableLookups : [];
  return lookups.map((lookup) => ({
    accountKey: lookup.accountKey.toBase58(),
    writableIndexes: [...lookup.writableIndexes],
    readonlyIndexes: [...lookup.readonlyIndexes],
  }));
}

function isWritableStatic(header: MessageHeader, index: number, staticCount: number): boolean {
  const signedWritable = header.numRequiredSignatures - header.numReadonlySignedAccounts;
  if (index < header.numRequiredSignatures) {
    return index < signedWritable;
  }
  const unsignedWritable =
    staticCount - header.numRequiredSignatures - header.numReadonlyUnsignedAccounts;
  return index < header.numRequiredSignatures + unsignedWritable;
}

function mergeAccountKeys(
  message: VersionedMessage,
  loadedAddresses: TransactionWire["loadedAddresses"],
): { keys: NormalizedAccountKey[]; lookupsUnresolved: boolean } {
  const header = message.header;
  const staticList = staticKeys(message);
  const keys: NormalizedAccountKey[] = staticList.map((key, index) =>
    classifyAccountKey({
      address: key.toBase58(),
      signer: index < header.numRequiredSignatures,
      writable: isWritableStatic(header, index, staticList.length),
      source: "static",
    }),
  );

  const lookups = lookupsOf(message);
  if (lookups.length === 0) {
    return { keys, lookupsUnresolved: false };
  }

  if (!loadedAddresses) {
    return { keys, lookupsUnresolved: true };
  }

  for (const address of loadedAddresses.writable) {
    keys.push(
      classifyAccountKey({
        address,
        signer: false,
        writable: true,
        source: "address_lookup_table",
      }),
    );
  }
  for (const address of loadedAddresses.readonly) {
    keys.push(
      classifyAccountKey({
        address,
        signer: false,
        writable: false,
        source: "address_lookup_table",
      }),
    );
  }
  return { keys, lookupsUnresolved: false };
}

function compiledInstructionsOf(message: VersionedMessage, accountKeys: NormalizedAccountKey[]) {
  return message.compiledInstructions.map((instruction, index) => {
    const programAccountIndex = instruction.programIdIndex;
    const program = accountKeys[programAccountIndex];
    return {
      index,
      programAccountIndex,
      programId: program?.address ?? null,
      accountIndexes: [...instruction.accountKeyIndexes],
      dataBase64: Buffer.from(instruction.data).toString("base64"),
    };
  });
}

function serializeVersioned(transaction: VersionedTransaction): Uint8Array {
  return transaction.serialize();
}

function deserializeBytes(bytes: Uint8Array): VersionedTransaction {
  if (bytes.length === 0) {
    throw new InvalidTransactionError("Transaction bytes are empty.");
  }
  if (bytes.length > MAX_SOLANA_TRANSACTION_BYTES) {
    throw new InvalidTransactionError(
      `Transaction is ${bytes.length} bytes; Solana transactions cannot exceed ${MAX_SOLANA_TRANSACTION_BYTES} bytes.`,
    );
  }
  try {
    return VersionedTransaction.deserialize(bytes);
  } catch (versionedCause) {
    try {
      const legacy = Transaction.from(Buffer.from(bytes));
      const serialized = legacy.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
      return VersionedTransaction.deserialize(serialized);
    } catch {
      throw new InvalidTransactionError(
        "Could not deserialize a Solana transaction from the provided bytes.",
        versionedCause,
      );
    }
  }
}

function decodeBase64(value: string): Uint8Array {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new InvalidTransactionError("Transaction base64 string is empty.");
  }
  const bytes = Buffer.from(trimmed, "base64");
  if (bytes.length === 0) {
    throw new InvalidTransactionError("Transaction base64 string did not decode to any bytes.");
  }
  return Uint8Array.from(bytes);
}

function versionedFromLocal(input: LocalTransactionInput): VersionedTransaction {
  if (input instanceof Uint8Array) {
    return deserializeBytes(input);
  }
  if (input.source === "bytes") {
    return deserializeBytes(input.bytes);
  }
  if (input.source === "base64") {
    return deserializeBytes(decodeBase64(input.base64));
  }
  if (input.source === "versioned") {
    return input.transaction;
  }
  const serialized = input.transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  return deserializeBytes(Uint8Array.from(serialized));
}

/** Wire bytes for a local input. Used by simulation without a second deserialize path. */
export function transactionBytesFromInput(input: LocalTransactionInput): Uint8Array {
  return serializeVersioned(versionedFromLocal(input));
}

function fromVersioned(
  transaction: VersionedTransaction,
  source: TransactionInputSource,
  extras?: {
    loadedAddresses?: TransactionWire["loadedAddresses"];
    confirmation?: ConfirmedTransactionContext | null;
    plugins?: readonly InstructionDecoderPlugin[];
  },
): NormalizedTransaction {
  const bytes = serializeVersioned(transaction);
  const message = transaction.message;
  const { keys, lookupsUnresolved } = mergeAccountKeys(message, extras?.loadedAddresses ?? null);
  const signaturesBase58 = transaction.signatures.map((signature) => encodeBase58(signature));
  const instructions = decodeInstructions(
    compiledInstructionsOf(message, keys),
    keys,
    extras?.plugins ?? [],
  );
  const notes = decodeSummaryNotes(instructions);
  if (lookupsUnresolved) {
    notes.push(LOOKUPS_UNRESOLVED_NOTE);
  }
  const curveClassification = summarizeCurveClassification(keys);
  notes.push(...curveClassificationNotes(curveClassification));
  const feePayer = keys[0]?.address ?? null;

  return {
    version: messageVersion(message),
    feePayer,
    recentBlockhash: message.recentBlockhash,
    accountKeys: keys,
    addressTableLookups: lookupsOf(message),
    lookupsUnresolved,
    instructions,
    signaturesBase58,
    signed: transaction.signatures.some((signature) => !isAllZero(signature)),
    byteLength: bytes.length,
    source,
    confirmation: extras?.confirmation ?? null,
    resolvedAccounts: [],
    accountResolution: { attempted: false, found: 0, notFound: 0 },
    curveClassification,
    notes,
  };
}

export function normalizeLocalTransaction(
  input: LocalTransactionInput,
  options?: Pick<NormalizeOptions, "plugins">,
): NormalizedTransaction {
  const extras = options?.plugins ? { plugins: options.plugins } : undefined;
  if (input instanceof Uint8Array) {
    return fromVersioned(versionedFromLocal(input), "bytes", extras);
  }
  if (input.source === "bytes") {
    return fromVersioned(versionedFromLocal(input), "bytes", extras);
  }
  if (input.source === "base64") {
    return fromVersioned(versionedFromLocal(input), "base64", extras);
  }
  if (input.source === "versioned") {
    return fromVersioned(input.transaction, "versioned", extras);
  }
  return fromVersioned(versionedFromLocal(input), "legacy", extras);
}

async function normalizeVersioned(
  transaction: VersionedTransaction,
  source: TransactionInputSource,
  extras: {
    loadedAddresses?: TransactionWire["loadedAddresses"];
    confirmation?: ConfirmedTransactionContext | null;
    plugins?: readonly InstructionDecoderPlugin[];
  } = {},
  rpc?: SolanaRpc,
): Promise<NormalizedTransaction> {
  let loaded = extras.loadedAddresses ?? null;
  const lookupNotes: string[] = [];
  const lookups = lookupsOf(transaction.message);
  if (rpc && lookups.length > 0 && !loaded) {
    const resolved = await resolveLookupAddresses(rpc, lookups);
    loaded = resolved.loadedAddresses;
    lookupNotes.push(...resolved.notes);
  }

  const normalized = fromVersioned(transaction, source, {
    ...(extras.confirmation !== undefined ? { confirmation: extras.confirmation } : {}),
    ...(extras.plugins ? { plugins: extras.plugins } : {}),
    ...(loaded ? { loadedAddresses: loaded } : {}),
  });

  if (!rpc) {
    return withSkippedAccountResolution(normalized);
  }
  return attachResolvedAccounts(normalized, rpc, lookupNotes);
}

export async function normalizeTransaction(
  input: TransactionInput,
  options?: NormalizeOptions,
): Promise<NormalizedTransaction> {
  if (typeof input === "object" && !(input instanceof Uint8Array) && input.source === "signature") {
    if (!options?.rpc) {
      throw new InvalidTransactionError(
        "A Solana RPC client is required to normalize a confirmed transaction signature.",
      );
    }
    const wire = await options.rpc.getTransactionWire(input.signature);
    if (!wire) {
      throw new TransactionNotFoundError(input.signature);
    }
    const transaction = deserializeBytes(wire.bytes);
    return normalizeVersioned(
      transaction,
      "signature",
      {
        loadedAddresses: wire.loadedAddresses,
        confirmation: {
          signature: wire.signature,
          slot: wire.slot,
          blockTime: wire.blockTime,
          err: wire.err,
          feeLamports: wire.feeLamports,
        },
        ...(options.plugins ? { plugins: options.plugins } : {}),
      },
      options.rpc,
    );
  }

  if (!options?.rpc) {
    return withSkippedAccountResolution(normalizeLocalTransaction(input, options));
  }

  if (input instanceof Uint8Array) {
    return normalizeVersioned(
      deserializeBytes(input),
      "bytes",
      options.plugins ? { plugins: options.plugins } : {},
      options.rpc,
    );
  }
  if (input.source === "bytes") {
    return normalizeVersioned(
      deserializeBytes(input.bytes),
      "bytes",
      options.plugins ? { plugins: options.plugins } : {},
      options.rpc,
    );
  }
  if (input.source === "base64") {
    return normalizeVersioned(
      deserializeBytes(decodeBase64(input.base64)),
      "base64",
      options.plugins ? { plugins: options.plugins } : {},
      options.rpc,
    );
  }
  if (input.source === "versioned") {
    return normalizeVersioned(
      input.transaction,
      "versioned",
      options.plugins ? { plugins: options.plugins } : {},
      options.rpc,
    );
  }
  const serialized = input.transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  return normalizeVersioned(
    deserializeBytes(Uint8Array.from(serialized)),
    "legacy",
    options.plugins ? { plugins: options.plugins } : {},
    options.rpc,
  );
}
