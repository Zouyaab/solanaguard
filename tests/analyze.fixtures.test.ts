/**
 * Offline fixture pipeline: normalize → rules/score → optional simulate/compare.
 * Uses locally built transactions and stub RPC — not recorded chain dumps.
 */
import { describe, expect, it } from "vitest";
import { analyzeTransaction } from "@solanaguard/analyzer";
import {
  buildSignedMemo,
  buildSignedTransfer,
  buildSignedUnknownProgram,
  buildUnsignedTransfer,
} from "./fixtures/transactions.js";
import { createFixtureRpc } from "./fixtures/mock-rpc.js";
import { WELL_KNOWN } from "./fixtures/well-known.js";

describe("Fixture analyze pipeline (offline)", () => {
  it("analyzes a signed system transfer without RPC", async () => {
    const fixture = buildSignedTransfer(1000);
    const report = await analyzeTransaction({ source: "base64", base64: fixture.base64 });

    expect(report.transaction.instructions).toHaveLength(1);
    expect(report.transaction.instructions[0]?.programId).toBe(WELL_KNOWN.systemProgram);
    expect(report.transaction.instructions[0]?.instructionType).toBe("Transfer");
    expect(report.transaction.instructions[0]?.args.lamports).toBe("1000");
    expect(report.transaction.signed).toBe(true);
    expect(report.evaluation.findings).toEqual([]);
    expect(report.score.total).toBe(0);
    expect(report.score.band).toBe("no_findings");
    expect(report.simulation).toBeNull();
    expect(report.comparison).toBeNull();
    expect(report.note).toMatch(/not a safety verdict/i);
    expect(JSON.stringify(report)).not.toMatch(/\bmalicious\b/i);
  });

  it("flags an unsigned message as info, not malice", async () => {
    const fixture = buildUnsignedTransfer();
    const report = await analyzeTransaction({ source: "versioned", transaction: fixture.transaction });

    expect(report.transaction.signed).toBe(false);
    expect(report.evaluation.findings.some((f) => f.ruleId === "unsigned_message")).toBe(true);
    expect(report.evaluation.findings[0]?.severity).toBe("info");
    expect(report.note).toMatch(/not a safety verdict/i);
  });

  it("decodes SPL Memo and keeps empty findings without RPC", async () => {
    const fixture = buildSignedMemo("phase-17-fixture");
    const report = await analyzeTransaction({ source: "base64", base64: fixture.base64 });

    expect(report.transaction.instructions[0]?.programId).toBe(WELL_KNOWN.memoV2);
    expect(report.transaction.instructions[0]?.instructionType).toBe("Memo");
    expect(report.transaction.instructions[0]?.args.message).toBe("phase-17-fixture");
    expect(report.evaluation.findings).toEqual([]);
    expect(report.simulation).toBeNull();
  });

  it("reports unknown_program as needs_review coverage gap", async () => {
    const fixture = buildSignedUnknownProgram();
    const report = await analyzeTransaction({ source: "base64", base64: fixture.base64 });

    expect(report.transaction.instructions[0]?.decodeStatus).toBe("unknown_program");
    const finding = report.evaluation.findings.find((f) => f.ruleId === "unknown_program");
    expect(finding?.severity).toBe("needs_review");
    expect(finding?.explanation).toMatch(/not evidence of malice/i);
    expect(finding?.evidence.programIds).toContain(fixture.programId);
  });

  it("with stub RPC: resolves system program, simulates, and still disclaims safety", async () => {
    const fixture = buildSignedTransfer();
    const rpc = createFixtureRpc();
    const report = await analyzeTransaction(
      { source: "base64", base64: fixture.base64 },
      { rpc },
    );

    expect(report.transaction.accountResolution.attempted).toBe(true);
    expect(report.transaction.accountResolution.found).toBeGreaterThanOrEqual(1);
    expect(report.transaction.accountResolution.notFound).toBeGreaterThanOrEqual(1);
    expect(report.evaluation.findings.some((f) => f.ruleId === "account_not_found")).toBe(true);
    expect(report.simulation).not.toBeNull();
    expect(report.simulation?.success).toBe(false);
    expect(report.comparison).not.toBeNull();
    expect(report.note).toMatch(/not a safety verdict/i);
    expect(report.simulation?.note).toMatch(/not a safety verdict/i);
  });

  it("skips simulation when includeSimulation is false", async () => {
    const fixture = buildSignedTransfer();
    const rpc = createFixtureRpc();
    const report = await analyzeTransaction(
      { source: "base64", base64: fixture.base64 },
      { rpc, includeSimulation: false },
    );

    expect(report.transaction.accountResolution.attempted).toBe(true);
    expect(report.simulation).toBeNull();
    expect(report.comparison).toBeNull();
  });
});
