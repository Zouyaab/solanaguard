import { describe, expect, it } from "vitest";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { assertDevnetEndpoint, buildDemoTransferTransaction, DEMO_TRANSFER_LAMPORTS } from "./solana.js";

describe("wallet demo helpers", () => {
  it("refuses mainnet endpoints", () => {
    expect(() => assertDevnetEndpoint("https://api.mainnet-beta.solana.com")).toThrow(/Devnet only/i);
    expect(() => assertDevnetEndpoint("https://api.devnet.solana.com")).not.toThrow();
  });

  it("builds an unsigned self-transfer as base64", async () => {
    const payer = Keypair.generate().publicKey;
    const connection = {
      rpcEndpoint: "https://api.devnet.solana.com",
      getLatestBlockhash: async () => ({
        blockhash: "11111111111111111111111111111111",
        lastValidBlockHeight: 1,
      }),
    } as unknown as Connection;

    const { transaction, base64 } = await buildDemoTransferTransaction(connection, payer);
    expect(transaction.instructions).toHaveLength(1);
    expect(transaction.feePayer?.equals(payer)).toBe(true);
    expect(base64.length).toBeGreaterThan(32);
    expect(transaction.signatures.length === 0 || transaction.signatures.every((item) => !item.signature)).toBe(
      true,
    );

    const data = Buffer.from(transaction.instructions[0]!.data);
    // SystemProgram transfer layout: 4-byte instruction index + 8-byte lamports
    expect(data.readUInt32LE(0)).toBe(2);
    expect(Number(data.readBigUInt64LE(4))).toBe(DEMO_TRANSFER_LAMPORTS);
    expect(transaction.instructions[0]!.keys[0]!.pubkey).toBeInstanceOf(PublicKey);
  });
});
