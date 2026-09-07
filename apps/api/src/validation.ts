/**
 * Runtime validators for path/query-style Solana identifiers.
 * Complements Fastify JSON Schema (length + charset).
 */

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;

export function isBase58(value: string): boolean {
  return BASE58_RE.test(value);
}

export function validateAddressParam(address: string): string | null {
  const trimmed = address.trim();
  if (trimmed.length < 32 || trimmed.length > 64) {
    return "address must be between 32 and 64 characters.";
  }
  if (!isBase58(trimmed)) {
    return "address must be base58 (no 0, O, I, or l characters).";
  }
  return null;
}

export function validateSignatureParam(signature: string): string | null {
  const trimmed = signature.trim();
  if (trimmed.length < 64 || trimmed.length > 128) {
    return "signature must be between 64 and 128 characters.";
  }
  if (!isBase58(trimmed)) {
    return "signature must be base58 (no 0, O, I, or l characters).";
  }
  return null;
}

export function validateProgramIdParam(programId: string): string | null {
  return validateAddressParam(programId);
}
