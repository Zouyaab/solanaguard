import { describe, expect, it } from "vitest";
import { normalizeSimulateRpcResult } from "./simulate.js";

describe("normalizeSimulateRpcResult", () => {
  it("maps a failed simulation with logs and units", () => {
    const result = normalizeSimulateRpcResult({
      contextSlot: 99,
      value: {
        err: { InstructionError: [0, "Custom"] },
        logs: ["Program log: fail"],
        unitsConsumed: 1200,
        accounts: null,
        innerInstructions: null,
        returnData: null,
        replacementBlockhash: { blockhash: "Hash11111111111111111111111111111111111111111" },
      },
      options: { accounts: ["11111111111111111111111111111111"] },
      sigVerify: false,
      replaceRecentBlockhash: true,
    });
    expect(result.available).toBe(true);
    expect(result.success).toBe(false);
    expect(result.logs).toEqual(["Program log: fail"]);
    expect(result.unitsConsumed).toBe(1200);
    expect(result.contextSlot).toBe(99);
    expect(result.replacementBlockhash).toMatch(/^Hash/);
    expect(result.accountsRequested).toEqual(["11111111111111111111111111111111"]);
    expect(result.accounts[0]?.returned).toBe(false);
    expect(result.accountsReturned).toBe(false);
    expect(result.sigVerify).toBe(false);
    expect(result.replaceRecentBlockhash).toBe(true);
  });

  it("maps returned accounts and inner instructions without calling them a verdict", () => {
    const result = normalizeSimulateRpcResult({
      contextSlot: 1,
      value: {
        err: null,
        logs: ["ok"],
        unitsConsumed: 500,
        accounts: [
          {
            lamports: 42,
            owner: "11111111111111111111111111111111",
            executable: false,
            data: ["AQID", "base64"],
          },
        ],
        innerInstructions: [
          {
            index: 0,
            instructions: [
              {
                programIdIndex: 3,
                programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                accounts: [0, 1],
                data: "AQ==",
              },
            ],
          },
        ],
        returnData: {
          programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          data: ["BQ==", "base64"],
        },
      },
      options: { accounts: ["FeePayer11111111111111111111111111111111111"] },
    });
    expect(result.success).toBe(true);
    expect(result.accountsReturned).toBe(true);
    expect(result.accounts[0]).toMatchObject({
      address: "FeePayer11111111111111111111111111111111111",
      returned: true,
      lamports: 42,
      dataBase64: "AQID",
      dataLength: 3,
    });
    expect(result.innerInstructions).toHaveLength(1);
    expect(result.innerInstructions[0]?.programId).toBe(
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    );
    expect(result.returnData?.dataBase64).toBe("BQ==");
    expect(JSON.stringify(result)).not.toMatch(/\bmalicious\b/i);
  });
});
