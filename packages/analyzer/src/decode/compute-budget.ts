import {
  ComputeBudgetInstruction,
  ComputeBudgetProgram,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import type { InstructionDecoderPlugin } from "./plugin.js";
import { readU32Le } from "./plugin.js";

export const computeBudgetDecoder: InstructionDecoderPlugin = {
  programId: ComputeBudgetProgram.programId.toBase58(),
  programName: "compute_budget",
  decode({ data, accountIndexes, accountKeys }) {
    // web3.js v1 does not decode SetLoadedAccountsDataSizeLimit (tag 4).
    if (data[0] === 4) {
      const accountDataSizeLimit = readU32Le(data, 1);
      if (accountDataSizeLimit === null) {
        return null;
      }
      return {
        instructionType: "SetLoadedAccountsDataSizeLimit",
        namedAccounts: [],
        args: { accountDataSizeLimit },
      };
    }

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
    const instruction = new TransactionInstruction({
      programId: ComputeBudgetProgram.programId,
      keys,
      data: Buffer.from(data),
    });

    let instructionType: string;
    try {
      instructionType = ComputeBudgetInstruction.decodeInstructionType(instruction);
    } catch {
      return null;
    }

    try {
      switch (instructionType) {
        case "SetComputeUnitLimit": {
          const decoded = ComputeBudgetInstruction.decodeSetComputeUnitLimit(instruction);
          return {
            instructionType,
            namedAccounts: [],
            args: { units: decoded.units },
          };
        }
        case "SetComputeUnitPrice": {
          const decoded = ComputeBudgetInstruction.decodeSetComputeUnitPrice(instruction);
          return {
            instructionType,
            namedAccounts: [],
            args: { microLamports: decoded.microLamports.toString() },
          };
        }
        case "RequestHeapFrame": {
          const decoded = ComputeBudgetInstruction.decodeRequestHeapFrame(instruction);
          return {
            instructionType,
            namedAccounts: [],
            args: { bytes: decoded.bytes },
          };
        }
        case "RequestUnits": {
          const decoded = ComputeBudgetInstruction.decodeRequestUnits(instruction);
          return {
            instructionType,
            namedAccounts: [],
            args: {
              units: decoded.units,
              additionalFee: decoded.additionalFee,
            },
          };
        }
        default:
          return { instructionType, namedAccounts: [], args: {} };
      }
    } catch {
      return null;
    }
  },
};
