import { describe, expect, it } from "vitest";
import {
  validateAddressParam,
  validateProgramIdParam,
  validateSignatureParam,
} from "./validation.js";

describe("validation helpers", () => {
  it("accepts the System Program address", () => {
    expect(validateAddressParam("11111111111111111111111111111111")).toBeNull();
    expect(validateProgramIdParam("11111111111111111111111111111111")).toBeNull();
  });

  it("rejects short, long, and non-base58 addresses", () => {
    expect(validateAddressParam("short")).toMatch(/between 32 and 64/);
    expect(validateAddressParam("0".repeat(32))).toMatch(/base58/);
    expect(validateAddressParam("O".repeat(32))).toMatch(/base58/);
  });

  it("rejects invalid signatures", () => {
    expect(validateSignatureParam("abc")).toMatch(/between 64 and 128/);
    expect(validateSignatureParam("0".repeat(64))).toMatch(/base58/);
    expect(validateSignatureParam("1".repeat(64))).toBeNull();
  });
});
