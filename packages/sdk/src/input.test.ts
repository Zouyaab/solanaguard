import { describe, expect, it } from "vitest";
import { toTransactionRequest, transactionRequestBody } from "./input.js";
import { SolanaGuardRequestError } from "./errors.js";

describe("toTransactionRequest", () => {
  it("accepts a non-empty base64 string", () => {
    expect(toTransactionRequest("YWJj")).toEqual({ base64: "YWJj" });
  });

  it("rejects empty strings and empty bytes", () => {
    expect(() => toTransactionRequest("   ")).toThrow(SolanaGuardRequestError);
    expect(() => toTransactionRequest(new Uint8Array())).toThrow(SolanaGuardRequestError);
  });

  it("encodes bytes to base64", () => {
    const body = toTransactionRequest(Uint8Array.from([97, 98, 99]));
    expect(body).toEqual({ base64: "YWJj" });
  });

  it("rejects providing both base64 and signature", () => {
    expect(() => toTransactionRequest({ base64: "YWJj", signature: "x".repeat(64) })).toThrow(
      /either base64 or signature/,
    );
  });

  it("passes includeSimulation for object inputs", () => {
    expect(toTransactionRequest({ base64: "YWJj", includeSimulation: false })).toEqual({
      base64: "YWJj",
      includeSimulation: false,
    });
    expect(toTransactionRequest({ signature: "s".repeat(64), includeSimulation: true })).toEqual({
      signature: "s".repeat(64),
      includeSimulation: true,
    });
  });

  it("rejects non-boolean includeSimulation", () => {
    expect(() =>
      toTransactionRequest({ base64: "YWJj", includeSimulation: "no" as unknown as boolean }),
    ).toThrow(/includeSimulation/);
  });

  it("rejects unrecognized shapes", () => {
    expect(() => toTransactionRequest({} as never)).toThrow(/must be base64/);
  });
});

describe("transactionRequestBody", () => {
  it("omits undefined includeSimulation", () => {
    expect(transactionRequestBody({ base64: "YWJj" })).toEqual({ base64: "YWJj" });
    expect(transactionRequestBody({ signature: "s".repeat(64), includeSimulation: false })).toEqual(
      {
        signature: "s".repeat(64),
        includeSimulation: false,
      },
    );
  });
});
