import { PublicKey } from "@solana/web3.js";
import { InvalidAddressError } from "./errors.js";

export function parseAddress(value: string): PublicKey {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new InvalidAddressError(value);
  }
  try {
    return new PublicKey(trimmed);
  } catch (cause) {
    throw new InvalidAddressError(value, cause);
  }
}

export function addressToBase58(value: string): string {
  return parseAddress(value).toBase58();
}

/** Show host only so API keys in query strings never leave the process. */
export function publicEndpointLabel(rpcUrl: string): string {
  try {
    const url = new URL(rpcUrl);
    const path = url.pathname === "/" ? "" : url.pathname;
    return `${url.protocol}//${url.host}${path}`;
  } catch {
    return "(invalid SOLANA_RPC_URL)";
  }
}
