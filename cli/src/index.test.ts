import { describe, expect, it } from "vitest";
import { SOLANAGUARD_VERSION } from "@solanaguard/types";
import { runCli } from "./cli.js";
import { formatAnalysisReport } from "./report.js";
import { parseTransactionArgs } from "./flags.js";

const TRANSFER_BASE64 =
  "Aecq9mMF4htQuahqnrKRXHzGPmtuxSNj3PCHqwV+aESk4I3P/1AGM7tneIzgF4eNbTZwmDDTGz4rED2UfyWGtgKAAQABAwafd7Wj1Am+2iNI3JDf0BDwxjcevjSU6u+w7PElwShXB8c/1UTJwIVBcsnyguiJJXGSUgVkHRojpkD+x44QnbIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQICAAEMAgAAAAEAAAAAAAAAAA==";

describe("CLI flags", () => {
  it("accepts positional base64 and shared flags", () => {
    const parsed = parseTransactionArgs(
      ["--json", "--no-simulation", TRANSFER_BASE64],
      "usage",
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.json).toBe(true);
    expect(parsed.includeSimulation).toBe(false);
    expect(parsed.input).toEqual({ source: "base64", base64: TRANSFER_BASE64 });
  });
});

describe("formatAnalysisReport", () => {
  it("prints an observational report without malice language", () => {
    const text = formatAnalysisReport({
      transaction: { source: "base64" } as never,
      evaluation: {
        findings: [
          {
            ruleId: "unknown_program",
            title: "Unknown program interaction",
            explanation: "Requires review because the decoder has no plugin.",
            severity: "needs_review",
            evidence: {},
          },
        ],
        rulesEvaluated: 1,
        rulesFired: 1,
        note: "not a risk score",
      },
      score: {
        total: 35,
        cap: 100,
        band: "requires_review",
        contributions: [],
        weights: { info: 5, unusual: 20, needs_review: 35 },
        note: "not a proof of safety",
      },
      simulation: {
        success: true,
        error: null,
        logs: [],
        unitsConsumed: 100,
        contextSlot: 1,
        replacementBlockhash: null,
        returnData: null,
        innerInstructions: [],
        accounts: [],
        accountsRequested: [],
        accountsReturned: false,
        sigVerify: false,
        replaceRecentBlockhash: true,
        lookupsUnresolved: false,
        note: "not a safety verdict",
      },
      comparison: {
        expectedEffects: [],
        observations: [],
        summary: { matched: 1, diverged: 0, incomplete: 0, notApplicable: 0 },
        note: "not a safety verdict",
      },
      note: "not a safety verdict",
    });
    expect(text).toMatch(/SOLANAGUARD TRANSACTION REPORT/);
    expect(text).toMatch(/Score band: requires_review/);
    expect(text).toMatch(/Score: 35\/100/);
    expect(text).toMatch(/FINDINGS/);
    expect(text).toMatch(/SIMULATION/);
    expect(text).toMatch(/success: true/);
    expect(text).toMatch(/not a safety verdict/i);
    expect(text).not.toMatch(/malicious/i);
  });
});

describe("CLI", () => {
  it("prints the version with --version", async () => {
    const result = await runCli(["--version"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(SOLANAGUARD_VERSION);
  });

  it("lists analyze and program in help without claiming a safety product", async () => {
    const result = await runCli([]);
    expect(result.stdout).toMatch(/solanaguard analyze/i);
    expect(result.stdout).toMatch(/solanaguard program/i);
    expect(result.stdout).toMatch(/solanaguard transaction/i);
    expect(result.stdout).toMatch(/not a safety verdict/i);
    expect(result.stdout).toMatch(/web dashboard/i);
    expect(result.stdout).not.toMatch(/Not implemented yet/i);
  });

  it("requires args for normalize, rules, score, simulate, compare, analyze", async () => {
    for (const command of ["normalize", "rules", "score", "simulate", "compare", "analyze"]) {
      const result = await runCli([command]);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toMatch(new RegExp(`Usage: solanaguard ${command}`, "i"));
    }
  });

  it("requires an address for account, program, and transaction", async () => {
    expect((await runCli(["account"])).stdout).toMatch(/Usage: solanaguard account/i);
    expect((await runCli(["program"])).stdout).toMatch(/Usage: solanaguard program/i);
    expect((await runCli(["transaction"])).stdout).toMatch(/Usage: solanaguard transaction/i);
  });
});
