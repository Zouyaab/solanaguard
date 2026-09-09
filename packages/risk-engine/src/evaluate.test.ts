import { describe, expect, it } from "vitest";
import type { NormalizedCompiledInstruction, NormalizedTransaction } from "@solanaguard/types";
import { defaultRiskRules } from "./defaults.js";
import { evaluateRules, RULE_EVALUATION_NOTE } from "./evaluate.js";
import { mergeRules, type RiskRule } from "./plugin.js";

function instruction(
  partial: Partial<NormalizedCompiledInstruction> &
    Pick<NormalizedCompiledInstruction, "decodeStatus" | "programId">,
): NormalizedCompiledInstruction {
  return {
    index: 0,
    programAccountIndex: 0,
    accountIndexes: [],
    dataBase64: "",
    decoded: partial.decodeStatus === "decoded",
    programName: null,
    instructionType: null,
    namedAccounts: [],
    args: {},
    ...partial,
  };
}

function transaction(overrides: Partial<NormalizedTransaction> = {}): NormalizedTransaction {
  return {
    version: "legacy",
    feePayer: "11111111111111111111111111111111",
    recentBlockhash: "11111111111111111111111111111111",
    accountKeys: [],
    addressTableLookups: [],
    lookupsUnresolved: false,
    instructions: [
      instruction({
        decodeStatus: "decoded",
        programId: "11111111111111111111111111111111",
        programName: "system",
        instructionType: "Transfer",
      }),
    ],
    signaturesBase58: ["sig"],
    signed: true,
    byteLength: 100,
    source: "base64",
    confirmation: null,
    resolvedAccounts: [],
    accountResolution: { attempted: false, found: 0, notFound: 0 },
    curveClassification: { onCurve: 1, offCurve: 0, signerOffCurve: 0 },
    notes: [],
    ...overrides,
  };
}

describe("evaluateRules", () => {
  it("returns a stable empty-findings result for a fully decoded signed transfer", () => {
    const result = evaluateRules(transaction());
    expect(result.findings).toEqual([]);
    expect(result.rulesEvaluated).toBe(defaultRiskRules.length);
    expect(result.rulesFired).toBe(0);
    expect(result.note).toBe(RULE_EVALUATION_NOTE);
    expect(result).not.toHaveProperty("score");
  });

  it("reports unknown programs as needs_review, not malice", () => {
    const result = evaluateRules(
      transaction({
        instructions: [
          instruction({
            decodeStatus: "unknown_program",
            programId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
          }),
        ],
      }),
    );
    expect(result.rulesFired).toBe(1);
    expect(result.findings[0]?.ruleId).toBe("unknown_program");
    expect(result.findings[0]?.severity).toBe("needs_review");
    expect(result.findings[0]?.explanation).toMatch(/not evidence of malice/i);
    expect(result.findings[0]?.explanation).not.toMatch(/\bmalicious\b/i);
  });

  it("reports off-curve required signers as unusual", () => {
    const result = evaluateRules(
      transaction({
        curveClassification: { onCurve: 0, offCurve: 1, signerOffCurve: 1 },
      }),
    );
    expect(result.findings.map((item) => item.ruleId)).toContain("signer_off_curve");
    expect(result.findings.find((item) => item.ruleId === "signer_off_curve")?.severity).toBe(
      "unusual",
    );
  });

  it("does not treat missing cluster accounts as malice", () => {
    const result = evaluateRules(
      transaction({
        accountResolution: { attempted: true, found: 1, notFound: 2 },
      }),
    );
    const missing = result.findings.find((item) => item.ruleId === "account_not_found");
    expect(missing?.severity).toBe("info");
    expect(missing?.explanation).toMatch(/not a risk finding/i);
  });

  it("skips account_not_found when resolution was not attempted", () => {
    const result = evaluateRules(transaction());
    expect(result.findings.some((item) => item.ruleId === "account_not_found")).toBe(false);
  });

  it("lets extra rules override the same id", () => {
    const override: RiskRule = {
      id: "unknown_program",
      title: "Override",
      evaluate: () => [
        {
          ruleId: "unknown_program",
          title: "Override",
          severity: "info",
          explanation: "Replacement rule ran.",
          evidence: { custom: true },
        },
      ],
    };
    const result = evaluateRules(
      transaction({
        instructions: [
          instruction({
            decodeStatus: "unknown_program",
            programId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
          }),
        ],
      }),
      mergeRules(defaultRiskRules, [override]),
    );
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.title).toBe("Override");
    expect(result.findings[0]?.severity).toBe("info");
  });

  it("reports unsigned payloads as informational previews", () => {
    const result = evaluateRules(transaction({ signed: false, signaturesBase58: [] }));
    expect(result.findings.map((item) => item.ruleId)).toContain("unsigned_message");
    expect(result.findings.find((item) => item.ruleId === "unsigned_message")?.severity).toBe(
      "info",
    );
  });

  it("reports unrecognized layouts as needs_review without claiming malice", () => {
    const result = evaluateRules(
      transaction({
        instructions: [
          instruction({
            decodeStatus: "unrecognized_layout",
            programId: "11111111111111111111111111111111",
            programName: "system_program",
          }),
        ],
      }),
    );
    expect(result.findings[0]?.ruleId).toBe("unrecognized_layout");
    expect(result.findings[0]?.severity).toBe("needs_review");
    expect(result.findings[0]?.explanation).not.toMatch(/\bmalicious\b/i);
  });

  it("reports unresolved program ids and unresolved lookups", () => {
    const byStatus = evaluateRules(
      transaction({
        instructions: [
          instruction({
            decodeStatus: "unresolved_program_id",
            programId: null,
          }),
        ],
      }),
    );
    expect(byStatus.findings[0]?.ruleId).toBe("unresolved_program_id");

    const byLookups = evaluateRules(transaction({ lookupsUnresolved: true }));
    expect(byLookups.findings[0]?.ruleId).toBe("unresolved_program_id");
    expect(byLookups.findings[0]?.evidence.lookupsUnresolved).toBe(true);
  });

  it("is deterministic for identical transactions", () => {
    const input = transaction({
      signed: false,
      instructions: [
        instruction({
          decodeStatus: "unknown_program",
          programId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
        }),
      ],
    });
    expect(evaluateRules(input)).toEqual(evaluateRules(input));
  });

  it("evaluates a custom list without the default unsigned rule", () => {
    const onlyUnknown: RiskRule = {
      id: "unknown_program",
      title: "Unknown program",
      evaluate: () => null,
    };
    const result = evaluateRules(transaction({ signed: false }), [onlyUnknown]);
    expect(result.rulesEvaluated).toBe(1);
    expect(result.findings).toEqual([]);
  });
});
