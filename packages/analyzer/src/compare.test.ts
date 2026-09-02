import { describe, expect, it } from "vitest";
import type {
  NormalizedCompiledInstruction,
  NormalizedTransaction,
  SimulationReport,
} from "@solanaguard/types";
import {
  BEHAVIOR_COMPARISON_NOTE,
  compareExpectedToSimulated,
  deriveExpectedEffects,
} from "./compare.js";

const FROM = "From111111111111111111111111111111111111111";
const TO = "To11111111111111111111111111111111111111111";
const SYSTEM = "11111111111111111111111111111111";

function transferInstruction(
  overrides: Partial<NormalizedCompiledInstruction> = {},
): NormalizedCompiledInstruction {
  return {
    index: 0,
    programAccountIndex: 2,
    programId: SYSTEM,
    accountIndexes: [0, 1],
    dataBase64: "",
    decoded: true,
    decodeStatus: "decoded",
    programName: "system_program",
    instructionType: "Transfer",
    namedAccounts: [
      { name: "from", index: 0, address: FROM },
      { name: "to", index: 1, address: TO },
    ],
    args: { lamports: "1000" },
    ...overrides,
  };
}

function baseTransaction(
  overrides: Partial<NormalizedTransaction> = {},
): NormalizedTransaction {
  return {
    version: 0,
    feePayer: FROM,
    recentBlockhash: "11111111111111111111111111111111",
    accountKeys: [
      {
        address: FROM,
        signer: true,
        writable: true,
        source: "static",
        onCurve: true,
        curveClass: "on_curve",
      },
      {
        address: TO,
        signer: false,
        writable: true,
        source: "static",
        onCurve: true,
        curveClass: "on_curve",
      },
      {
        address: SYSTEM,
        signer: false,
        writable: false,
        source: "static",
        onCurve: false,
        curveClass: "off_curve",
      },
    ],
    addressTableLookups: [],
    lookupsUnresolved: false,
    instructions: [transferInstruction()],
    signaturesBase58: [],
    signed: true,
    byteLength: 100,
    source: "base64",
    confirmation: null,
    resolvedAccounts: [
      {
        address: FROM,
        presence: "found",
        lamports: "5000",
        owner: SYSTEM,
        executable: false,
        dataLength: 0,
        onCurve: true,
        curveClass: "on_curve",
      },
      {
        address: TO,
        presence: "found",
        lamports: "0",
        owner: SYSTEM,
        executable: false,
        dataLength: 0,
        onCurve: true,
        curveClass: "on_curve",
      },
    ],
    accountResolution: { attempted: true, found: 2, notFound: 0 },
    curveClassification: { onCurve: 2, offCurve: 1, signerOffCurve: 0 },
    notes: [],
    ...overrides,
  };
}

function baseSimulation(overrides: Partial<SimulationReport> = {}): SimulationReport {
  return {
    success: true,
    error: null,
    logs: [],
    unitsConsumed: 100,
    contextSlot: 1,
    replacementBlockhash: "22222222222222222222222222222222",
    returnData: null,
    innerInstructions: [],
    accounts: [
      {
        address: FROM,
        returned: true,
        lamports: "3900",
        owner: SYSTEM,
        executable: false,
        dataLength: 0,
        dataBase64: null,
      },
      {
        address: TO,
        returned: true,
        lamports: "1000",
        owner: SYSTEM,
        executable: false,
        dataLength: 0,
        dataBase64: null,
      },
    ],
    accountsRequested: [FROM, TO],
    accountsReturned: true,
    sigVerify: false,
    replaceRecentBlockhash: true,
    lookupsUnresolved: false,
    note: "test",
    ...overrides,
  };
}

describe("deriveExpectedEffects", () => {
  it("derives debit and credit for System Transfer", () => {
    const effects = deriveExpectedEffects(baseTransaction());
    expect(effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "lamport_debit",
          address: FROM,
          amount: "1000",
        }),
        expect.objectContaining({
          kind: "lamport_credit",
          address: TO,
          amount: "1000",
        }),
      ]),
    );
  });

  it("marks undecoded instructions as incomplete expectations", () => {
    const effects = deriveExpectedEffects(
      baseTransaction({
        instructions: [
          transferInstruction({
            decoded: false,
            decodeStatus: "unknown_program",
            programName: null,
            instructionType: null,
            namedAccounts: [],
            args: {},
          }),
        ],
      }),
    );
    expect(effects).toHaveLength(1);
    expect(effects[0]?.kind).toBe("undecoded_instruction");
  });
});

describe("compareExpectedToSimulated", () => {
  it("matches transfer deltas and allows a fee on the fee payer", () => {
    const comparison = compareExpectedToSimulated(baseTransaction(), baseSimulation());
    expect(comparison.note).toBe(BEHAVIOR_COMPARISON_NOTE);
    expect(comparison.note).toMatch(/not a safety verdict/i);
    expect(comparison.summary.matched).toBeGreaterThanOrEqual(2);
    expect(comparison.summary.diverged).toBe(0);
    expect(JSON.stringify(comparison)).not.toMatch(/malicious|safe\b/i);
  });

  it("reports divergence when recipient delta differs", () => {
    const comparison = compareExpectedToSimulated(
      baseTransaction(),
      baseSimulation({
        accounts: [
          {
            address: FROM,
            returned: true,
            lamports: "3900",
            owner: SYSTEM,
            executable: false,
            dataLength: 0,
            dataBase64: null,
          },
          {
            address: TO,
            returned: true,
            lamports: "500",
            owner: SYSTEM,
            executable: false,
            dataLength: 0,
            dataBase64: null,
          },
        ],
      }),
    );
    expect(comparison.summary.diverged).toBeGreaterThanOrEqual(1);
    expect(comparison.observations.some((item) => item.status === "diverged")).toBe(true);
  });

  it("marks pre-state gaps as incomplete", () => {
    const comparison = compareExpectedToSimulated(
      baseTransaction({
        resolvedAccounts: [],
        accountResolution: { attempted: false, found: 0, notFound: 0 },
      }),
      baseSimulation(),
    );
    expect(comparison.summary.incomplete).toBeGreaterThan(0);
    expect(
      comparison.observations.some((item) => item.title.includes("Pre-state lamports missing")),
    ).toBe(true);
  });

  it("marks simulation failure with expected transfers as diverged", () => {
    const comparison = compareExpectedToSimulated(
      baseTransaction(),
      baseSimulation({
        success: false,
        error: { InstructionError: [0, "Custom"] },
        accounts: [],
        accountsReturned: false,
      }),
    );
    expect(
      comparison.observations.some(
        (item) =>
          item.id === "simulation_failed_with_expected_transfers" && item.status === "diverged",
      ),
    ).toBe(true);
  });

  it("leaves SPL token amounts incomplete without parsed token balances", () => {
    const comparison = compareExpectedToSimulated(
      baseTransaction({
        instructions: [
          transferInstruction({
            programName: "spl_token",
            instructionType: "Transfer",
            namedAccounts: [
              { name: "source", index: 0, address: FROM },
              { name: "destination", index: 1, address: TO },
              { name: "authority", index: 0, address: FROM },
            ],
            args: { amount: "42" },
          }),
        ],
      }),
      baseSimulation(),
    );
    expect(
      comparison.observations.some(
        (item) => item.status === "incomplete" && /token amount/i.test(item.title),
      ),
    ).toBe(true);
  });
});
