import { PublicKey } from "@solana/web3.js";
import type {
  CurveClass,
  CurveClassificationSummary,
  NormalizedAccountKey,
} from "@solanaguard/types";

export const CURVE_CLASSIFICATION_NOTE =
  "Off-curve keys are common for program-derived addresses. Off-curve is not evidence of malice. Seeds were not recovered. On-curve is not proof of a user wallet.";

export const SIGNER_OFF_CURVE_NOTE =
  "One or more required signers are off the Ed25519 curve. That is unusual for an Ed25519 signature. It is not by itself evidence of malice.";

export function classifyAddress(address: string): {
  onCurve: boolean;
  curveClass: CurveClass;
} {
  const onCurve = PublicKey.isOnCurve(address);
  return { onCurve, curveClass: onCurve ? "on_curve" : "off_curve" };
}

export function classifyAccountKey(
  key: Omit<NormalizedAccountKey, "onCurve" | "curveClass">,
): NormalizedAccountKey {
  const curve = classifyAddress(key.address);
  return { ...key, ...curve };
}

export function summarizeCurveClassification(
  keys: readonly NormalizedAccountKey[],
): CurveClassificationSummary {
  const onCurve = keys.filter((key) => key.onCurve).length;
  return {
    onCurve,
    offCurve: keys.length - onCurve,
    signerOffCurve: keys.filter((key) => key.signer && !key.onCurve).length,
  };
}

export function curveClassificationNotes(summary: CurveClassificationSummary): string[] {
  const notes = [
    `${summary.offCurve} of ${summary.onCurve + summary.offCurve} account key(s) are off the Ed25519 curve. ${CURVE_CLASSIFICATION_NOTE}`,
  ];
  if (summary.signerOffCurve > 0) {
    notes.push(
      `${summary.signerOffCurve} required signer(s) are off-curve. ${SIGNER_OFF_CURVE_NOTE}`,
    );
  }
  return notes;
}
