import { describe, expect, it } from "vitest";
import { parseTransactionArgs } from "./flags.js";

const usage = "Usage: solanaguard analyze --base64 <TX>";

describe("parseTransactionArgs", () => {
  it("parses --base64 and optional flags", () => {
    const result = parseTransactionArgs(["--json", "--no-simulation", "--base64", "YWJj"], usage);
    expect(result).toEqual({
      ok: true,
      input: { source: "base64", base64: "YWJj" },
      includeSimulation: false,
      json: true,
    });
  });

  it("parses positional base64", () => {
    const result = parseTransactionArgs(["YWJj"], usage);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input).toEqual({ source: "base64", base64: "YWJj" });
    }
  });

  it("parses --signature", () => {
    const sig = "1".repeat(64);
    const result = parseTransactionArgs(["--signature", sig], usage);
    expect(result).toEqual({
      ok: true,
      input: { source: "signature", signature: sig },
      includeSimulation: true,
      json: false,
    });
  });

  it("rejects missing flag values and unknown flags", () => {
    expect(parseTransactionArgs(["--base64"], usage)).toEqual({ ok: false, usage });
    expect(parseTransactionArgs(["--weird"], usage)).toEqual({ ok: false, usage });
  });

  it("rejects both base64 and signature", () => {
    expect(parseTransactionArgs(["--base64", "a", "--signature", "b".repeat(64)], usage)).toEqual({
      ok: false,
      usage,
    });
  });

  it("rejects extra positionals", () => {
    expect(parseTransactionArgs(["a", "b"], usage)).toEqual({ ok: false, usage });
    expect(parseTransactionArgs(["--base64", "a", "extra"], usage)).toEqual({ ok: false, usage });
  });
});
