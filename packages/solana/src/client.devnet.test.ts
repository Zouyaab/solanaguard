/**
 * Live Devnet checks. Off by default so CI does not fail on public RPC flakes.
 *
 *   SOLANAGUARD_DEVNET_IT=1 pnpm test
 */
import { describe, expect, it } from "vitest";
import { Keypair, SystemProgram } from "@solana/web3.js";
import { createSolanaRpcFromUrl } from "./factory.js";

const enabled = process.env.SOLANAGUARD_DEVNET_IT === "1";
const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

describe.skipIf(!enabled)("Devnet RPC (live)", () => {
  const rpc = createSolanaRpcFromUrl(rpcUrl);

  it("returns a slot and a recent blockhash", async () => {
    const status = await rpc.getStatus();
    expect(status.reachable).toBe(true);
    expect(status.slot).toBeGreaterThan(0);
    const blockhash = await rpc.getLatestBlockhash();
    expect(blockhash.blockhash.length).toBeGreaterThan(0);
    expect(blockhash.lastValidBlockHeight).toBeGreaterThan(0);
  }, 25_000);

  it("loads the System Program account and a missing wallet", async () => {
    const system = await rpc.getAccount(SystemProgram.programId.toBase58());
    expect(system).not.toBeNull();
    expect(system?.executable).toBe(true);
    expect(system?.owner).toBe("NativeLoader1111111111111111111111111111111");

    const missing = await rpc.getAccount(Keypair.generate().publicKey.toBase58());
    expect(missing).toBeNull();

    const balance = await rpc.getBalance(SystemProgram.programId.toBase58());
    expect(balance).toBeGreaterThanOrEqual(0n);
  }, 25_000);

  it("returns null for a well-formed signature that is not on Devnet", async () => {
    // 64-byte all-zero signature, base58. Valid encoding; not a confirmed tx.
    const emptySig = "1".repeat(64);
    const result = await rpc.getTransaction(emptySig);
    expect(result).toBeNull();
  }, 25_000);
});
