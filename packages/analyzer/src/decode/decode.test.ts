import { describe, expect, it } from "vitest";
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import type { InstructionDecoderPlugin } from "./plugin.js";
import { decodeCompiledInstruction } from "./apply.js";
import { mergeDecoderPlugins } from "./defaults.js";
import { MEMO_PROGRAM_V2 } from "./memo.js";
import { TOKEN_PROGRAM_ID } from "./token.js";
import { LOOKUPS_UNRESOLVED_NOTE, normalizeLocalTransaction } from "../normalize.js";

const BLOCKHASH = "11111111111111111111111111111111";
const plugins = mergeDecoderPlugins();

function compile(instructions: TransactionInstruction[], payer: Keypair): VersionedTransaction {
  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: BLOCKHASH,
    instructions,
  }).compileToV0Message();
  return new VersionedTransaction(message);
}

describe("instruction decoder plugins", () => {
  it("decodes a System Program transfer", () => {
    const payer = Keypair.generate();
    const to = Keypair.generate();
    const transaction = compile(
      [
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: to.publicKey,
          lamports: 1000,
        }),
      ],
      payer,
    );
    const normalized = normalizeLocalTransaction({ source: "versioned", transaction });
    const instruction = normalized.instructions[0];
    expect(instruction?.decoded).toBe(true);
    expect(instruction?.decodeStatus).toBe("decoded");
    expect(instruction?.programName).toBe("system_program");
    expect(instruction?.instructionType).toBe("Transfer");
    expect(instruction?.args.lamports).toBe("1000");
    expect(normalized.notes[0]).toMatch(/1 of 1 instruction\(s\) decoded/);
    expect(normalized.notes.some((note) => note.includes(LOOKUPS_UNRESOLVED_NOTE))).toBe(false);
  });

  it("decodes Compute Budget setComputeUnitLimit", () => {
    const payer = Keypair.generate();
    const transaction = compile(
      [ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 })],
      payer,
    );
    const normalized = normalizeLocalTransaction({ source: "versioned", transaction });
    const instruction = normalized.instructions[0];
    expect(instruction?.decoded).toBe(true);
    expect(instruction?.programName).toBe("compute_budget");
    expect(instruction?.instructionType).toBe("SetComputeUnitLimit");
    expect(instruction?.args.units).toBe(200_000);
  });

  it("decodes an SPL Memo as UTF-8", () => {
    const payer = Keypair.generate();
    const transaction = compile(
      [
        new TransactionInstruction({
          programId: new PublicKey(MEMO_PROGRAM_V2),
          keys: [],
          data: Buffer.from("hello-guard", "utf8"),
        }),
      ],
      payer,
    );
    const normalized = normalizeLocalTransaction({ source: "versioned", transaction });
    const instruction = normalized.instructions.find((item) => item.programId === MEMO_PROGRAM_V2);
    expect(instruction?.decoded).toBe(true);
    expect(instruction?.instructionType).toBe("Memo");
    expect(instruction?.args.message).toBe("hello-guard");
  });

  it("decodes an SPL Token transfer amount", () => {
    const data = Buffer.alloc(9);
    data[0] = 3;
    data.writeBigUInt64LE(42n, 1);
    const instruction = decodeCompiledInstruction(
      {
        index: 0,
        programAccountIndex: 3,
        programId: TOKEN_PROGRAM_ID,
        accountIndexes: [0, 1, 2],
        dataBase64: data.toString("base64"),
      },
      [
        {
          address: "Src11111111111111111111111111111111111111111",
          signer: false,
          writable: true,
          source: "static",
          onCurve: true,
          curveClass: "on_curve",
        },
        {
          address: "Dst11111111111111111111111111111111111111111",
          signer: false,
          writable: true,
          source: "static",
          onCurve: true,
          curveClass: "on_curve",
        },
        {
          address: "Own11111111111111111111111111111111111111111",
          signer: true,
          writable: false,
          source: "static",
          onCurve: true,
          curveClass: "on_curve",
        },
        {
          address: TOKEN_PROGRAM_ID,
          signer: false,
          writable: false,
          source: "static",
          onCurve: true,
          curveClass: "on_curve",
        },
      ],
      plugins,
    );
    expect(instruction.decoded).toBe(true);
    expect(instruction.instructionType).toBe("Transfer");
    expect(instruction.args.amount).toBe("42");
  });

  it("marks unresolved program ids when the program key is missing", () => {
    const instruction = decodeCompiledInstruction(
      {
        index: 0,
        programAccountIndex: 9,
        programId: null,
        accountIndexes: [],
        dataBase64: Buffer.from([0]).toString("base64"),
      },
      [],
      plugins,
    );
    expect(instruction.decoded).toBe(false);
    expect(instruction.decodeStatus).toBe("unresolved_program_id");
  });

  it("leaves unknown programs decoded: false", () => {
    const payer = Keypair.generate();
    const unknown = Keypair.generate();
    const transaction = compile(
      [
        new TransactionInstruction({
          programId: unknown.publicKey,
          keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
          data: Buffer.from([9, 9, 9]),
        }),
      ],
      payer,
    );
    const normalized = normalizeLocalTransaction({ source: "versioned", transaction });
    const instruction = normalized.instructions.find(
      (item) => item.programId === unknown.publicKey.toBase58(),
    );
    expect(instruction?.decoded).toBe(false);
    expect(instruction?.decodeStatus).toBe("unknown_program");
    expect(normalized.notes.some((note) => note.includes("no decoder plugin"))).toBe(true);
  });

  it("lets an extra plugin override a program id", () => {
    const customProgram = Keypair.generate().publicKey.toBase58();
    const plugin: InstructionDecoderPlugin = {
      programId: customProgram,
      programName: "fixture_program",
      decode: () => ({
        instructionType: "Ping",
        namedAccounts: [],
        args: { ok: true },
      }),
    };
    const instruction = decodeCompiledInstruction(
      {
        index: 0,
        programAccountIndex: 0,
        programId: customProgram,
        accountIndexes: [],
        dataBase64: Buffer.from([1]).toString("base64"),
      },
      [],
      mergeDecoderPlugins([plugin]),
    );
    expect(instruction.decoded).toBe(true);
    expect(instruction.programName).toBe("fixture_program");
    expect(instruction.instructionType).toBe("Ping");
  });
});
