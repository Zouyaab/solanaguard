import type { InstructionDecoderPlugin } from "./plugin.js";
import { namedAccount, readU64Le } from "./plugin.js";

export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

function decodeToken({
  data,
  accountIndexes,
  accountKeys,
}: Parameters<InstructionDecoderPlugin["decode"]>[0]) {
  if (data.length < 1) {
    return null;
  }
  const tag = data[0];
  if (tag === 3) {
    const amount = readU64Le(data, 1);
    if (amount === null) {
      return null;
    }
    return {
      instructionType: "Transfer",
      namedAccounts: [
        namedAccount("source", accountIndexes[0], accountKeys),
        namedAccount("destination", accountIndexes[1], accountKeys),
        namedAccount("authority", accountIndexes[2], accountKeys),
      ],
      args: { amount: amount.toString() },
    };
  }
  if (tag === 12) {
    const amount = readU64Le(data, 1);
    if (amount === null || data.length < 10) {
      return null;
    }
    return {
      instructionType: "TransferChecked",
      namedAccounts: [
        namedAccount("source", accountIndexes[0], accountKeys),
        namedAccount("mint", accountIndexes[1], accountKeys),
        namedAccount("destination", accountIndexes[2], accountKeys),
        namedAccount("authority", accountIndexes[3], accountKeys),
      ],
      args: { amount: amount.toString(), decimals: data[9] ?? null },
    };
  }
  if (tag === 9) {
    return {
      instructionType: "CloseAccount",
      namedAccounts: [
        namedAccount("account", accountIndexes[0], accountKeys),
        namedAccount("destination", accountIndexes[1], accountKeys),
        namedAccount("authority", accountIndexes[2], accountKeys),
      ],
      args: {},
    };
  }
  return null;
}

export const splTokenDecoder: InstructionDecoderPlugin = {
  programId: TOKEN_PROGRAM_ID,
  programName: "spl_token",
  decode: decodeToken,
};

export const splToken2022Decoder: InstructionDecoderPlugin = {
  programId: TOKEN_2022_PROGRAM_ID,
  programName: "spl_token_2022",
  decode: decodeToken,
};
