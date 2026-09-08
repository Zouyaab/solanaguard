import type { TransactionAnalysisReport } from "@solanaguard/types";

/** Minimal observational report for dashboard component tests (not a safety verdict). */
export function sampleAnalysisReport(
  overrides: Partial<TransactionAnalysisReport> = {},
): TransactionAnalysisReport {
  const base: TransactionAnalysisReport = {
    transaction: {
      version: "legacy",
      feePayer: "11111111111111111111111111111111",
      recentBlockhash: "11111111111111111111111111111111",
      accountKeys: [
        {
          address: "11111111111111111111111111111111",
          signer: true,
          writable: true,
          source: "static",
          onCurve: true,
          curveClass: "on_curve",
        },
      ],
      addressTableLookups: [],
      lookupsUnresolved: false,
      instructions: [
        {
          index: 0,
          programAccountIndex: 0,
          programId: "11111111111111111111111111111111",
          accountIndexes: [0],
          dataBase64: "AgAAAAEAAAAAAAAAAA==",
          decoded: true,
          decodeStatus: "decoded",
          programName: "System Program",
          instructionType: "transfer",
          namedAccounts: [],
          args: {},
        },
      ],
      signaturesBase58: [],
      signed: false,
      byteLength: 200,
      source: "base64",
      confirmation: null,
      resolvedAccounts: [],
      accountResolution: { attempted: false, found: 0, notFound: 0 },
      curveClassification: { onCurve: 1, offCurve: 0, signerOffCurve: 0 },
      notes: [],
    },
    evaluation: {
      findings: [
        {
          ruleId: "demo-rule",
          severity: "info",
          title: "Self-transfer observed",
          explanation: "Informational finding for UI tests.",
          evidence: {},
        },
      ],
      rulesEvaluated: 1,
      rulesFired: 1,
      note: "not a risk score",
    },
    score: {
      total: 5,
      cap: 100,
      band: "informational",
      contributions: [],
      weights: { info: 5, unusual: 20, needs_review: 35 },
      note: "not a proof of safety",
    },
    simulation: {
      success: true,
      error: null,
      logs: ["Program log: test"],
      unitsConsumed: 500,
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
      note: "simulated in tests",
    },
    comparison: {
      expectedEffects: [],
      observations: [],
      summary: { matched: 1, diverged: 0, incomplete: 0, notApplicable: 0 },
      note: "comparison placeholder",
    },
    note: "not a safety verdict",
  };

  return { ...base, ...overrides };
}
