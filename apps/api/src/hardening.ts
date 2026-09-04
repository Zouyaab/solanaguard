/**
 * Phase 16 request hardening helpers.
 * SolanaGuard analyzes transactions without ever accepting signing material.
 */

import { MAX_SOLANA_TRANSACTION_BYTES } from "@solanaguard/types";

/** Field names that must never appear on analyze/simulate request bodies. */
export const FORBIDDEN_SECRET_FIELDS = [
  "privateKey",
  "private_key",
  "secretKey",
  "secret_key",
  "seed",
  "seedPhrase",
  "seed_phrase",
  "mnemonic",
  "recoveryPhrase",
  "recovery_phrase",
  "password",
  "passphrase",
  "walletPassword",
] as const;

/** Max base64 character length for a Solana packet (with small padding margin). */
export const MAX_TRANSACTION_BASE64_CHARS =
  Math.ceil(MAX_SOLANA_TRANSACTION_BYTES / 3) * 4 + 16;

export function findForbiddenSecretField(body: unknown): string | null {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  const keys = Object.keys(body);
  for (const key of keys) {
    const normalized = key.toLowerCase().replace(/[-]/g, "");
    for (const forbidden of FORBIDDEN_SECRET_FIELDS) {
      if (normalized === forbidden.toLowerCase().replace(/[-]/g, "")) {
        return key;
      }
    }
  }
  return null;
}

export function estimateBase64DecodedBytes(base64: string): number {
  const trimmed = base64.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  const padding = trimmed.endsWith("==") ? 2 : trimmed.endsWith("=") ? 1 : 0;
  return Math.floor((trimmed.length * 3) / 4) - padding;
}

export function validateTransactionBase64(base64: string): string | null {
  if (base64.length > MAX_TRANSACTION_BASE64_CHARS) {
    return `base64 transaction exceeds ${MAX_TRANSACTION_BASE64_CHARS} characters (Solana packet limit).`;
  }
  const decoded = estimateBase64DecodedBytes(base64);
  if (decoded > MAX_SOLANA_TRANSACTION_BYTES) {
    return `Decoded transaction would be about ${decoded} bytes; Solana transactions cannot exceed ${MAX_SOLANA_TRANSACTION_BYTES} bytes.`;
  }
  return null;
}
