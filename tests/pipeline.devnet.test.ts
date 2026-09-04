/**
 * Live Devnet pipeline checks. Off by default so CI does not fail on public RPC flakes.
 *
 *   SOLANAGUARD_DEVNET_IT=1 pnpm test
 *   # or
 *   pnpm test:devnet
 */
import { describe, expect, it } from "vitest";
import {
  Keypair,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { analyzeTransaction } from "@solanaguard/analyzer";
import { createSolanaRpcFromUrl } from "@solanaguard/solana";
import { WELL_KNOWN } from "./fixtures/well-known.js";

const enabled = process.env.SOLANAGUARD_DEVNET_IT === "1";
const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

describe.skipIf(!enabled)("Devnet analyze pipeline (live)", () => {
  const rpc = createSolanaRpcFromUrl(rpcUrl);

  it("loads well-known programs as executable accounts", async () => {
    const system = await rpc.getAccount(WELL_KNOWN.systemProgram);
    expect(system).not.toBeNull();
    expect(system?.executable).toBe(true);
    expect(system?.owner).toBe(WELL_KNOWN.nativeLoader);

    const token = await rpc.getAccount(WELL_KNOWN.tokenProgram);
    expect(token).not.toBeNull();
    expect(token?.executable).toBe(true);

    const memo = await rpc.getAccount(WELL_KNOWN.memoV2);
    expect(memo).not.toBeNull();
    expect(memo?.executable).toBe(true);
  }, 45_000);

  it("analyzes a fresh unsigned transfer against live simulate", async () => {
    const payer = Keypair.generate();
    const to = Keypair.generate();
    const { blockhash } = await rpc.getLatestBlockhash();
    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: blockhash,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: to.publicKey,
          lamports: 1000,
        }),
      ],
    }).compileToV0Message();
    const transaction = new VersionedTransaction(message);

    const report = await analyzeTransaction(
      { source: "versioned", transaction },
      { rpc },
    );

    expect(report.transaction.instructions[0]?.instructionType).toBe("Transfer");
    expect(report.transaction.instructions[0]?.programId).toBe(WELL_KNOWN.systemProgram);
    expect(report.transaction.signed).toBe(false);
    expect(report.evaluation.findings.some((f) => f.ruleId === "unsigned_message")).toBe(true);
    expect(report.transaction.accountResolution.attempted).toBe(true);
    expect(report.simulation).not.toBeNull();
    // Unfunded ephemeral wallets typically fail simulation; that is a cluster preview, not a verdict.
    expect(typeof report.simulation?.success).toBe("boolean");
    expect(report.comparison).not.toBeNull();
    expect(report.note).toMatch(/not a safety verdict/i);
    expect(JSON.stringify(report)).not.toMatch(/\bmalicious\b/i);
  }, 60_000);

  it("returns null for a well-formed signature that is not on Devnet", async () => {
    const emptySig = "1".repeat(64);
    const result = await rpc.getTransaction(emptySig);
    expect(result).toBeNull();
  }, 25_000);
});
