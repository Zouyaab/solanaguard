import bs58 from "bs58";

export function encodeBase58(bytes: Uint8Array): string {
  return bs58.encode(Buffer.from(bytes));
}

export function decodeBase58(value: string): Uint8Array {
  return Uint8Array.from(bs58.decode(value));
}

export function isAllZero(bytes: Uint8Array): boolean {
  for (const byte of bytes) {
    if (byte !== 0) {
      return false;
    }
  }
  return true;
}
