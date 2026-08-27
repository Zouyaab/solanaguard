import { describe, expect, it } from "vitest";
import { InvalidAddressError } from "./errors.js";
import { addressToBase58, publicEndpointLabel } from "./address.js";

describe("address helpers", () => {
  it("accepts the System Program address", () => {
    expect(addressToBase58("11111111111111111111111111111111")).toBe(
      "11111111111111111111111111111111",
    );
  });

  it("rejects an empty string", () => {
    expect(() => addressToBase58("")).toThrow(InvalidAddressError);
  });

  it("rejects a non-base58 key", () => {
    expect(() => addressToBase58("not-a-solana-address")).toThrow(InvalidAddressError);
  });

  it("strips query parameters from RPC URLs so keys are not logged", () => {
    expect(publicEndpointLabel("https://example.rpc.com/?api-key=secret")).toBe(
      "https://example.rpc.com",
    );
  });
});
