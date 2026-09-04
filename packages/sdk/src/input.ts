import type { SdkTransactionInput, SdkTransactionRequest } from "./types.js";
import { SolanaGuardRequestError } from "./errors.js";

/** Browser- and Node-safe base64 encoder (no Buffer dependency). */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  const nodeBuffer = (globalThis as { Buffer?: { from(data: Uint8Array): { toString(enc: string): string } } })
    .Buffer;
  if (nodeBuffer) {
    return nodeBuffer.from(bytes).toString("base64");
  }
  throw new SolanaGuardRequestError("No base64 encoder available in this runtime.");
}

/**
 * Normalize SDK inputs into the JSON body the API accepts.
 * Callers that hold a web3.js transaction should serialize it to bytes/base64 first.
 */
export function toTransactionRequest(input: SdkTransactionInput): SdkTransactionRequest {
  if (typeof input === "string") {
    if (!input.trim()) {
      throw new SolanaGuardRequestError("base64 transaction string must not be empty.");
    }
    return { base64: input };
  }
  if (input instanceof Uint8Array) {
    if (input.byteLength === 0) {
      throw new SolanaGuardRequestError("transaction bytes must not be empty.");
    }
    return { base64: bytesToBase64(input) };
  }

  const record = input as Record<string, unknown>;
  const hasBase64 = typeof record.base64 === "string";
  const hasSignature = typeof record.signature === "string";
  if (hasBase64 && hasSignature) {
    throw new SolanaGuardRequestError("Provide either base64 or signature, not both.");
  }
  if (hasBase64) {
    if (record.includeSimulation !== undefined && typeof record.includeSimulation !== "boolean") {
      throw new SolanaGuardRequestError("includeSimulation must be a boolean when provided.");
    }
    if (typeof record.includeSimulation === "boolean") {
      return { base64: record.base64 as string, includeSimulation: record.includeSimulation };
    }
    return { base64: record.base64 as string };
  }
  if (hasSignature) {
    if (record.includeSimulation !== undefined && typeof record.includeSimulation !== "boolean") {
      throw new SolanaGuardRequestError("includeSimulation must be a boolean when provided.");
    }
    if (typeof record.includeSimulation === "boolean") {
      return { signature: record.signature as string, includeSimulation: record.includeSimulation };
    }
    return { signature: record.signature as string };
  }
  throw new SolanaGuardRequestError(
    "Transaction input must be base64, signature, bytes, or a request object.",
  );
}

export function transactionRequestBody(input: SdkTransactionInput): Record<string, unknown> {
  const request = toTransactionRequest(input);
  if ("base64" in request) {
    const body: Record<string, unknown> = { base64: request.base64 };
    if (request.includeSimulation !== undefined) {
      body.includeSimulation = request.includeSimulation;
    }
    return body;
  }
  const body: Record<string, unknown> = { signature: request.signature };
  if (request.includeSimulation !== undefined) {
    body.includeSimulation = request.includeSimulation;
  }
  return body;
}
