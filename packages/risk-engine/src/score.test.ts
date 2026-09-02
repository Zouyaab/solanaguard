import { describe, expect, it } from "vitest";
import type { RuleEvaluation, RuleFinding } from "@solanaguard/types";
import {
  DEFAULT_SCORE_CAP,
  DEFAULT_SEVERITY_WEIGHTS,
  evaluateAndScore,
  RISK_SCORE_NOTE,
  scoreEvaluation,
} from "./score.js";
import type { NormalizedCompiledInstruction, NormalizedTransaction } from "@solanaguard/types";

function finding(
  partial: Pick<RuleFinding, "ruleId" | "severity"> & Partial<RuleFinding>,
): RuleFinding {
  return {
    title: partial.title ?? partial.ruleId,
    explanation: partial.explanation ?? "test",
    evidence: partial.evidence ?? {},
    ...partial,
  };
}

function evaluation(findings: RuleFinding[]): RuleEvaluation {
  return {
    findings,
    rulesEvaluated: 6,
    rulesFired: new Set(findings.map((item) => item.ruleId)).size,
    note: "test",
  };
}

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

describe("scoreEvaluation", () => {
  it("returns 0 with no_findings when nothing fired, and refuses a safety claim", () => {
    const score = scoreEvaluation(evaluation([]));
    expect(score.total).toBe(0);
    expect(score.band).toBe("no_findings");
    expect(score.contributions).toEqual([]);
    expect(score.cap).toBe(DEFAULT_SCORE_CAP);
    expect(score.weights).toEqual(DEFAULT_SEVERITY_WEIGHTS);
    expect(score.note).toBe(RISK_SCORE_NOTE);
    expect(score.note).toMatch(/not that the transaction is safe/i);
    expect(score.note).toMatch(/not a proof of safety/i);
    expect(JSON.stringify(score)).not.toMatch(/\bmalicious\b/i);
  });

  it("adds transparent severity weights per finding", () => {
    const score = scoreEvaluation(
      evaluation([
        finding({ ruleId: "unsigned_message", severity: "info" }),
        finding({ ruleId: "signer_off_curve", severity: "unusual" }),
        finding({ ruleId: "unknown_program", severity: "needs_review" }),
      ]),
    );
    expect(score.total).toBe(5 + 20 + 35);
    expect(score.band).toBe("requires_review");
    expect(score.contributions).toEqual([
      {
        ruleId: "unsigned_message",
        title: "unsigned_message",
        severity: "info",
        points: 5,
        reason: 'severity "info" weighs 5 points',
      },
      {
        ruleId: "signer_off_curve",
        title: "signer_off_curve",
        severity: "unusual",
        points: 20,
        reason: 'severity "unusual" weighs 20 points',
      },
      {
        ruleId: "unknown_program",
        title: "unknown_program",
        severity: "needs_review",
        points: 35,
        reason: 'severity "needs_review" weighs 35 points',
      },
    ]);
  });

  it("maps informational and elevated bands from the total", () => {
    expect(scoreEvaluation(evaluation([finding({ ruleId: "a", severity: "info" })])).band).toBe(
      "informational",
    );
    expect(
      scoreEvaluation(
        evaluation([
          finding({ ruleId: "a", severity: "unusual" }),
          finding({ ruleId: "b", severity: "info" }),
        ]),
      ).band,
    ).toBe("elevated");
  });

  it("caps the total and still lists uncapped contribution points", () => {
    const many = Array.from({ length: 10 }, (_, index) =>
      finding({ ruleId: `r${index}`, severity: "needs_review" }),
    );
    const score = scoreEvaluation(evaluation(many));
    expect(score.total).toBe(100);
    expect(score.contributions.reduce((sum, item) => sum + item.points, 0)).toBe(350);
  });

  it("accepts weight overrides without inventing negative points", () => {
    const score = scoreEvaluation(evaluation([finding({ ruleId: "a", severity: "info" })]), {
      weights: { info: 12, unusual: -1 },
    });
    expect(score.weights.info).toBe(12);
    expect(score.weights.unusual).toBe(DEFAULT_SEVERITY_WEIGHTS.unusual);
    expect(score.total).toBe(12);
  });
});

describe("evaluateAndScore", () => {
  it("scores a clean transfer as no_findings without claiming safety", () => {
    const result = evaluateAndScore(transaction());
    expect(result.evaluation.findings).toEqual([]);
    expect(result.score.total).toBe(0);
    expect(result.score.band).toBe("no_findings");
    expect(result.score.note).toMatch(/not a proof of safety/i);
  });

  it("scores an unknown program into the elevated band with an explicit contribution", () => {
    const result = evaluateAndScore(
      transaction({
        instructions: [
          instruction({
            decodeStatus: "unknown_program",
            programId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
          }),
        ],
      }),
    );
    expect(result.evaluation.findings[0]?.ruleId).toBe("unknown_program");
    expect(result.score.total).toBe(DEFAULT_SEVERITY_WEIGHTS.needs_review);
    expect(result.score.band).toBe("elevated");
    expect(result.score.contributions[0]?.points).toBe(35);
  });
});
