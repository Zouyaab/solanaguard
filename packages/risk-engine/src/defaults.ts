import type { NormalizedTransaction, RuleFinding } from "@solanaguard/types";
import type { RiskRule } from "./plugin.js";

function finding(
  rule: Pick<RiskRule, "id" | "title">,
  severity: RuleFinding["severity"],
  explanation: string,
  evidence: RuleFinding["evidence"],
): RuleFinding {
  return {
    ruleId: rule.id,
    title: rule.title,
    severity,
    explanation,
    evidence,
  };
}

const unknownProgram: RiskRule = {
  id: "unknown_program",
  title: "Unknown program",
  evaluate(transaction: NormalizedTransaction): RuleFinding[] | null {
    const ids = [
      ...new Set(
        transaction.instructions
          .filter((instruction) => instruction.decodeStatus === "unknown_program")
          .map((instruction) => instruction.programId)
          .filter((programId): programId is string => programId !== null),
      ),
    ].sort();
    if (ids.length === 0) {
      return null;
    }
    return [
      finding(unknownProgram, "needs_review", "One or more instructions target a program with no decoder plugin. Missing coverage is not evidence of malice.", {
        programCount: ids.length,
        programIds: ids.join(","),
      }),
    ];
  },
};

const unrecognizedLayout: RiskRule = {
  id: "unrecognized_layout",
  title: "Unrecognized instruction layout",
  evaluate(transaction: NormalizedTransaction): RuleFinding[] | null {
    const count = transaction.instructions.filter(
      (instruction) => instruction.decodeStatus === "unrecognized_layout",
    ).length;
    if (count === 0) {
      return null;
    }
    return [
      finding(
        unrecognizedLayout,
        "needs_review",
        "A known program was invoked with a data layout this tool does not parse. Could not determine the instruction meaning.",
        { instructionCount: count },
      ),
    ];
  },
};

const unresolvedProgramId: RiskRule = {
  id: "unresolved_program_id",
  title: "Unresolved program id",
  evaluate(transaction: NormalizedTransaction): RuleFinding[] | null {
    const count = transaction.instructions.filter(
      (instruction) => instruction.decodeStatus === "unresolved_program_id",
    ).length;
    if (count === 0 && !transaction.lookupsUnresolved) {
      return null;
    }
    return [
      finding(
        unresolvedProgramId,
        "needs_review",
        "The message references address lookup tables or program ids that were not fully loaded. Could not determine every program that would run.",
        {
          unresolvedInstructionCount: count,
          lookupsUnresolved: transaction.lookupsUnresolved,
        },
      ),
    ];
  },
};

const signerOffCurve: RiskRule = {
  id: "signer_off_curve",
  title: "Off-curve required signer",
  evaluate(transaction: NormalizedTransaction): RuleFinding[] | null {
    if (transaction.curveClassification.signerOffCurve === 0) {
      return null;
    }
    return [
      finding(
        signerOffCurve,
        "unusual",
        "One or more required signers are off the Ed25519 curve. That is unusual for an Ed25519 signature. It is not by itself evidence of malice. Seeds were not recovered.",
        { signerOffCurve: transaction.curveClassification.signerOffCurve },
      ),
    ];
  },
};

const accountNotFound: RiskRule = {
  id: "account_not_found",
  title: "Cluster account missing",
  evaluate(transaction: NormalizedTransaction): RuleFinding[] | null {
    if (!transaction.accountResolution.attempted || transaction.accountResolution.notFound === 0) {
      return null;
    }
    return [
      finding(
        accountNotFound,
        "info",
        "Account resolution ran and one or more keys had no account on the cluster. Missing data is not a risk finding.",
        { notFound: transaction.accountResolution.notFound },
      ),
    ];
  },
};

const unsignedMessage: RiskRule = {
  id: "unsigned_message",
  title: "Unsigned message",
  evaluate(transaction: NormalizedTransaction): RuleFinding[] | null {
    if (transaction.signed) {
      return null;
    }
    return [
      finding(
        unsignedMessage,
        "info",
        "The payload has no signatures yet. This is a message preview. It is not a confirmed transaction.",
        { signatureCount: transaction.signaturesBase58.length },
      ),
    ];
  },
};

export const defaultRiskRules: readonly RiskRule[] = [
  unknownProgram,
  unrecognizedLayout,
  unresolvedProgramId,
  signerOffCurve,
  accountNotFound,
  unsignedMessage,
];
