import { describe, expect, it } from "vitest";
import { parseTransactionFields, toTransactionInput } from "./transaction-body.js";

describe("parseTransactionFields", () => {
  it("accepts base64 and signature shapes", () => {
    expect(parseTransactionFields({ base64: "YWJj" })).toEqual({ base64: "YWJj" });
    const sig = "1".repeat(64);
    expect(parseTransactionFields({ signature: sig })).toEqual({ signature: sig });
  });

  it("rejects empty base64 and both fields", () => {
    expect(parseTransactionFields({ base64: "   " })).toEqual({
      error: "base64 must not be empty.",
    });
    expect(parseTransactionFields({ base64: "a", signature: "1".repeat(64) })).toMatchObject({
      error: expect.stringMatching(/either base64 or signature/),
    });
  });

  it("rejects non-base58 signatures", () => {
    expect(parseTransactionFields({ signature: "0".repeat(64) })).toMatchObject({
      error: expect.stringMatching(/base58/),
    });
  });

  it("maps fields to TransactionInput", () => {
    expect(toTransactionInput({ base64: "YWJj" })).toEqual({
      source: "base64",
      base64: "YWJj",
    });
    expect(toTransactionInput({})).toBeNull();
  });
});
