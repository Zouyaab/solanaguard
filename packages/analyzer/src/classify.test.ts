import { describe, expect, it } from "vitest";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  CURVE_CLASSIFICATION_NOTE,
  classifyAddress,
  classifyAccountKey,
  curveClassificationNotes,
  summarizeCurveClassification,
} from "./classify.js";
import { normalizeLocalTransaction } from "./normalize.js";

const BLOCKHASH = "11111111111111111111111111111111";

describe("curve classification", () => {
  it("marks a generated keypair as on-curve", () => {
    const keypair = Keypair.generate();
    const classified = classifyAddress(keypair.publicKey.toBase58());
    expect(classified.onCurve).toBe(true);
    expect(classified.curveClass).toBe("on_curve");
  });

  it("marks a findProgramAddressSync result as off-curve without calling it a PDA fact", () => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("solanaguard-phase-6")],
      SystemProgram.programId,
    );
    const classified = classifyAddress(pda.toBase58());
    expect(classified.onCurve).toBe(false);
    expect(classified.curveClass).toBe("off_curve");
    expect(CURVE_CLASSIFICATION_NOTE).toMatch(/not evidence of malice/i);
    expect(CURVE_CLASSIFICATION_NOTE).toMatch(/seeds were not recovered/i);
  });

  it("notes signer off-curve as unusual, not malice", () => {
    const pda = PublicKey.findProgramAddressSync(
      [Buffer.from("signer-check")],
      SystemProgram.programId,
    )[0];
    const summary = summarizeCurveClassification([
      classifyAccountKey({
        address: pda.toBase58(),
        signer: true,
        writable: true,
        source: "static",
      }),
    ]);
    expect(summary.signerOffCurve).toBe(1);
    const notes = curveClassificationNotes(summary);
    expect(notes.some((note) => note.includes("unusual"))).toBe(true);
    expect(notes.some((note) => /malicious/i.test(note))).toBe(false);
  });

  it("classifies keys on a local transfer", () => {
    const payer = Keypair.generate();
    const to = Keypair.generate();
    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: to.publicKey,
          lamports: 1,
        }),
      ],
    }).compileToV0Message();
    const normalized = normalizeLocalTransaction({
      source: "versioned",
      transaction: new VersionedTransaction(message),
    });
    const payerKey = normalized.accountKeys.find(
      (key) => key.address === payer.publicKey.toBase58(),
    );
    expect(payerKey?.onCurve).toBe(true);
    expect(payerKey?.signer).toBe(true);
    expect(normalized.curveClassification.signerOffCurve).toBe(0);
    expect(normalized.notes.some((note) => note.includes("not evidence of malice"))).toBe(true);
  });
});
