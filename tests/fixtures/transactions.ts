/**
 * Locally constructed transaction fixtures for offline pipeline tests.
 * These are built in-process — not recorded RPC responses or fabricated chain data.
 */
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { WELL_KNOWN } from "./well-known.js";

export const FIXTURE_BLOCKHASH = "11111111111111111111111111111111";

export interface TransferFixture {
  payer: Keypair;
  to: Keypair;
  lamports: number;
  transaction: VersionedTransaction;
  base64: string;
}

function toBase64(transaction: VersionedTransaction): string {
  return Buffer.from(transaction.serialize()).toString("base64");
}

export function buildSignedTransfer(lamports = 1000): TransferFixture {
  const payer = Keypair.generate();
  const to = Keypair.generate();
  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: FIXTURE_BLOCKHASH,
    instructions: [
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: to.publicKey,
        lamports,
      }),
    ],
  }).compileToV0Message();
  const transaction = new VersionedTransaction(message);
  transaction.sign([payer]);
  return { payer, to, lamports, transaction, base64: toBase64(transaction) };
}

export function buildUnsignedTransfer(lamports = 1000): TransferFixture {
  const payer = Keypair.generate();
  const to = Keypair.generate();
  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: FIXTURE_BLOCKHASH,
    instructions: [
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: to.publicKey,
        lamports,
      }),
    ],
  }).compileToV0Message();
  const transaction = new VersionedTransaction(message);
  return { payer, to, lamports, transaction, base64: toBase64(transaction) };
}

export function buildSignedMemo(text = "solanaguard-fixture"): {
  payer: Keypair;
  transaction: VersionedTransaction;
  base64: string;
  text: string;
} {
  const payer = Keypair.generate();
  const data = Buffer.from(text, "utf8");
  const instruction = new TransactionInstruction({
    keys: [],
    programId: new PublicKey(WELL_KNOWN.memoV2),
    data,
  });
  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: FIXTURE_BLOCKHASH,
    instructions: [instruction],
  }).compileToV0Message();
  const transaction = new VersionedTransaction(message);
  transaction.sign([payer]);
  return { payer, transaction, base64: toBase64(transaction), text };
}

export function buildSignedUnknownProgram(): {
  payer: Keypair;
  programId: string;
  transaction: VersionedTransaction;
  base64: string;
} {
  const payer = Keypair.generate();
  const program = Keypair.generate();
  const instruction = new TransactionInstruction({
    keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
    programId: program.publicKey,
    data: Buffer.from([1, 2, 3]),
  });
  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: FIXTURE_BLOCKHASH,
    instructions: [instruction],
  }).compileToV0Message();
  const transaction = new VersionedTransaction(message);
  transaction.sign([payer]);
  return {
    payer,
    programId: program.publicKey.toBase58(),
    transaction,
    base64: toBase64(transaction),
  };
}
