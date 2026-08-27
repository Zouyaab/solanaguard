import type { NormalizedAccountKey, NormalizedCompiledInstruction } from "@solanaguard/types";
import { mergeDecoderPlugins } from "./defaults.js";
import type { InstructionDecoderPlugin } from "./plugin.js";

export function decodeCompiledInstruction(
  instruction: Omit<
    NormalizedCompiledInstruction,
    "decoded" | "decodeStatus" | "programName" | "instructionType" | "namedAccounts" | "args"
  >,
  accountKeys: NormalizedAccountKey[],
  plugins: readonly InstructionDecoderPlugin[],
): NormalizedCompiledInstruction {
  const empty = {
    ...instruction,
    decoded: false,
    decodeStatus: "unknown_program" as const,
    programName: null,
    instructionType: null,
    namedAccounts: [],
    args: {},
  };

  if (instruction.programId === null) {
    return { ...empty, decodeStatus: "unresolved_program_id" };
  }

  const plugin = plugins.find((item) => item.programId === instruction.programId);
  if (!plugin) {
    return empty;
  }

  try {
    const view = plugin.decode({
      data: Uint8Array.from(Buffer.from(instruction.dataBase64, "base64")),
      accountIndexes: instruction.accountIndexes,
      accountKeys,
    });
    if (!view) {
      return {
        ...empty,
        decodeStatus: "unrecognized_layout",
        programName: plugin.programName,
      };
    }
    return {
      ...instruction,
      decoded: true,
      decodeStatus: "decoded",
      programName: plugin.programName,
      instructionType: view.instructionType,
      namedAccounts: view.namedAccounts,
      args: view.args,
    };
  } catch {
    return {
      ...empty,
      decodeStatus: "unrecognized_layout",
      programName: plugin.programName,
    };
  }
}

export function decodeInstructions(
  instructions: Array<
    Omit<
      NormalizedCompiledInstruction,
      "decoded" | "decodeStatus" | "programName" | "instructionType" | "namedAccounts" | "args"
    >
  >,
  accountKeys: NormalizedAccountKey[],
  extraPlugins: readonly InstructionDecoderPlugin[] = [],
): NormalizedCompiledInstruction[] {
  const plugins = mergeDecoderPlugins(extraPlugins);
  return instructions.map((instruction) =>
    decodeCompiledInstruction(instruction, accountKeys, plugins),
  );
}

export function decodeSummaryNotes(instructions: NormalizedCompiledInstruction[]): string[] {
  const decodedCount = instructions.filter((instruction) => instruction.decoded).length;
  const unknown = instructions.filter(
    (instruction) => instruction.decodeStatus === "unknown_program",
  ).length;
  const unrecognized = instructions.filter(
    (instruction) => instruction.decodeStatus === "unrecognized_layout",
  ).length;
  const notes = [
    `${decodedCount} of ${instructions.length} instruction(s) decoded. Decoding is not a risk assessment.`,
  ];
  if (unknown > 0) {
    notes.push(`${unknown} instruction(s) target a program with no decoder plugin.`);
  }
  if (unrecognized > 0) {
    notes.push(
      `${unrecognized} instruction(s) matched a known program but the data layout was not understood.`,
    );
  }
  return notes;
}
