import { describe, expect, it } from "vitest";
import {
  estimateBase64DecodedBytes,
  findForbiddenSecretField,
  validateTransactionBase64,
  MAX_TRANSACTION_BASE64_CHARS,
} from "./hardening.js";

describe("hardening helpers", () => {
  it("detects private-key style fields case-insensitively", () => {
    expect(findForbiddenSecretField({ privateKey: "x" })).toBe("privateKey");
    expect(findForbiddenSecretField({ seed_phrase: "x" })).toBe("seed_phrase");
    expect(findForbiddenSecretField({ base64: "abcd" })).toBeNull();
  });

  it("rejects oversized base64 payloads before decode", () => {
    const huge = "A".repeat(MAX_TRANSACTION_BASE64_CHARS + 1);
    expect(validateTransactionBase64(huge)).toMatch(/exceeds/i);
    expect(validateTransactionBase64("AQID")).toBeNull();
    expect(estimateBase64DecodedBytes("AQID")).toBe(3);
  });
});
