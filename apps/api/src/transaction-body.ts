/**
 * Shared request-body parsing for transaction endpoints.
 * Rejects malformed shapes before any RPC or analysis work.
 */

import type { TransactionInput } from "@solanaguard/analyzer";
import { validateTransactionBase64 } from "./hardening.js";

export interface ParsedTransactionFields {
  base64?: string;
  signature?: string;
  includeSimulation?: boolean;
}

export function parseTransactionFields(body: unknown): ParsedTransactionFields | { error: string } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { error: "JSON body must be an object with base64 or signature." };
  }
  const record = body as Record<string, unknown>;
  const base64 = record.base64;
  const signature = record.signature;
  if (typeof base64 === "string" && typeof signature === "string") {
    return { error: "Provide either base64 or signature, not both." };
  }
  if (typeof base64 !== "string" && typeof signature !== "string") {
    return { error: "JSON body must include string field base64 or signature." };
  }
  if (record.includeSimulation !== undefined && typeof record.includeSimulation !== "boolean") {
    return { error: "includeSimulation must be a boolean when provided." };
  }
  const fields: ParsedTransactionFields = {};
  if (typeof base64 === "string") {
    if (base64.trim().length === 0) {
      return { error: "base64 must not be empty." };
    }
    const sizeError = validateTransactionBase64(base64);
    if (sizeError) {
      return { error: sizeError };
    }
    fields.base64 = base64;
  }
  if (typeof signature === "string") {
    const trimmed = signature.trim();
    if (trimmed.length < 64 || trimmed.length > 128) {
      return { error: "signature must be a base58 string between 64 and 128 characters." };
    }
    if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmed)) {
      return { error: "signature must be base58 (no 0, O, I, or l characters)." };
    }
    fields.signature = trimmed;
  }
  if (typeof record.includeSimulation === "boolean") {
    fields.includeSimulation = record.includeSimulation;
  }
  return fields;
}

export function toTransactionInput(fields: ParsedTransactionFields): TransactionInput | null {
  if (typeof fields.base64 === "string") {
    return { source: "base64", base64: fields.base64 };
  }
  if (typeof fields.signature === "string") {
    return { source: "signature", signature: fields.signature };
  }
  return null;
}

export function isSignatureInput(
  input: TransactionInput,
): input is { source: "signature"; signature: string } {
  return (
    typeof input === "object" &&
    !(input instanceof Uint8Array) &&
    "source" in input &&
    input.source === "signature"
  );
}
