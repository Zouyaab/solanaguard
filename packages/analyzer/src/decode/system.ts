import {
  PublicKey,
  SystemInstruction,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import type { InstructionDecoderPlugin } from "./plugin.js";
import { namedAccount } from "./plugin.js";

function toInstruction(
  accountIndexes: number[],
  accountKeys: { address: string; signer: boolean; writable: boolean }[],
  data: Uint8Array,
): TransactionInstruction | null {
  const keys = [];
  for (const index of accountIndexes) {
    const account = accountKeys[index];
    if (!account) {
      return null;
    }
    keys.push({
      pubkey: new PublicKey(account.address),
      isSigner: account.signer,
      isWritable: account.writable,
    });
  }
  return new TransactionInstruction({
    programId: SystemProgram.programId,
    keys,
    data: Buffer.from(data),
  });
}

export const systemProgramDecoder: InstructionDecoderPlugin = {
  programId: SystemProgram.programId.toBase58(),
  programName: "system_program",
  decode({ data, accountIndexes, accountKeys }) {
    const instruction = toInstruction(accountIndexes, accountKeys, data);
    if (!instruction) {
      return null;
    }
    let instructionType: string;
    try {
      instructionType = SystemInstruction.decodeInstructionType(instruction);
    } catch {
      return null;
    }

    try {
      switch (instructionType) {
        case "Transfer": {
          const decoded = SystemInstruction.decodeTransfer(instruction);
          return {
            instructionType,
            namedAccounts: [
              namedAccount("from", accountIndexes[0], accountKeys),
              namedAccount("to", accountIndexes[1], accountKeys),
            ],
            args: { lamports: decoded.lamports.toString() },
          };
        }
        case "Create": {
          const decoded = SystemInstruction.decodeCreateAccount(instruction);
          return {
            instructionType,
            namedAccounts: [
              namedAccount("from", accountIndexes[0], accountKeys),
              namedAccount("newAccount", accountIndexes[1], accountKeys),
            ],
            args: {
              lamports: decoded.lamports.toString(),
              space: decoded.space.toString(),
              owner: decoded.programId.toBase58(),
            },
          };
        }
        case "Assign": {
          const decoded = SystemInstruction.decodeAssign(instruction);
          return {
            instructionType,
            namedAccounts: [namedAccount("account", accountIndexes[0], accountKeys)],
            args: { owner: decoded.programId.toBase58() },
          };
        }
        case "Allocate": {
          const decoded = SystemInstruction.decodeAllocate(instruction);
          return {
            instructionType,
            namedAccounts: [namedAccount("account", accountIndexes[0], accountKeys)],
            args: { space: decoded.space.toString() },
          };
        }
        default:
          return {
            instructionType,
            namedAccounts: accountIndexes.map((index, i) =>
              namedAccount(`account_${i}`, index, accountKeys),
            ),
            args: {},
          };
      }
    } catch {
      return null;
    }
  },
};
