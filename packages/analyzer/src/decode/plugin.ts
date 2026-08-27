import type {
  InstructionArgValue,
  NamedInstructionAccount,
  NormalizedAccountKey,
} from "@solanaguard/types";

export interface DecodedInstructionView {
  instructionType: string;
  namedAccounts: NamedInstructionAccount[];
  args: Record<string, InstructionArgValue>;
}

export interface InstructionDecoderPlugin {
  programId: string;
  programName: string;
  /**
   * Return a structured view, or null when this program is recognized
   * but the data layout is not understood.
   */
  decode(input: {
    data: Uint8Array;
    accountIndexes: number[];
    accountKeys: NormalizedAccountKey[];
  }): DecodedInstructionView | null;
}

export function namedAccount(
  name: string,
  index: number | undefined,
  accountKeys: NormalizedAccountKey[],
): NamedInstructionAccount {
  if (index === undefined) {
    return { name, index: -1, address: null };
  }
  return {
    name,
    index,
    address: accountKeys[index]?.address ?? null,
  };
}

export function readU64Le(data: Uint8Array, offset: number): bigint | null {
  if (offset + 8 > data.length) {
    return null;
  }
  const view = new DataView(data.buffer, data.byteOffset + offset, 8);
  return view.getBigUint64(0, true);
}

export function readU32Le(data: Uint8Array, offset: number): number | null {
  if (offset + 4 > data.length) {
    return null;
  }
  const view = new DataView(data.buffer, data.byteOffset + offset, 4);
  return view.getUint32(0, true);
}
