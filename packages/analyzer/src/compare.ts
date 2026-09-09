import type {
  BehaviorComparison,
  ComparisonObservation,
  NormalizedTransaction,
  SimulationReport,
} from "@solanaguard/types";
import {
  simulateNormalizedTransaction,
  type SimulateOptions,
  type SimulatedTransactionView,
} from "./simulate.js";
import type { TransactionInput } from "./normalize.js";
import { deriveExpectedEffects } from "./compare-effects.js";
import { observeInstructionEffects } from "./compare-instructions.js";
import { observeLamportDeltas } from "./compare-state.js";
import { obs, summarize } from "./compare-helpers.js";

export { deriveExpectedEffects } from "./compare-effects.js";

export interface ComparedTransactionView extends SimulatedTransactionView {
  comparison: BehaviorComparison;
}

export const BEHAVIOR_COMPARISON_NOTE =
  "These observations compare decoded instruction effects to a cluster simulation preview. " +
  "They are not a safety verdict, not a proof of attack, and not a substitute for review. " +
  "Simulation can differ from later execution (slot, blockhash, fees, competing transactions, program upgrades).";

/**
 * Compare decoded expectations to a simulation report.
 * Pure: no RPC. Does not claim safety.
 */
export function compareExpectedToSimulated(
  transaction: NormalizedTransaction,
  simulation: SimulationReport,
): BehaviorComparison {
  const expectedEffects = deriveExpectedEffects(transaction);
  const observations: ComparisonObservation[] = [];

  if (transaction.lookupsUnresolved) {
    observations.push(
      obs({
        id: "lookups_unresolved",
        status: "incomplete",
        title: "Lookup tables unresolved",
        explanation:
          "Address lookup tables were not fully loaded, so some accounts or programs may be missing from the comparison.",
        expected: null,
        observed: null,
        evidence: { lookupsUnresolved: true },
      }),
    );
  }

  const transferable = expectedEffects.filter(
    (effect) => effect.kind === "lamport_debit" || effect.kind === "lamport_credit",
  );

  if (transferable.length > 0 && !simulation.success) {
    observations.push(
      obs({
        id: "simulation_failed_with_expected_transfers",
        status: "diverged",
        title: "Simulation did not succeed",
        explanation:
          "Decoded instructions imply lamport transfers, but the simulation preview returned an error. That is a divergence between expected decode and simulated execution — not by itself evidence of malice.",
        expected: "simulation success",
        observed:
          simulation.error === null || simulation.error === undefined
            ? "failure without error object"
            : JSON.stringify(simulation.error),
        evidence: {
          expectedTransferEffects: transferable.length,
          unitsConsumed: simulation.unitsConsumed,
        },
      }),
    );
  } else if (transferable.length === 0 && !simulation.success) {
    observations.push(
      obs({
        id: "simulation_failed",
        status: "incomplete",
        title: "Simulation did not succeed",
        explanation:
          "The simulation preview failed. Without decoded transfer expectations, this is incomplete execution data rather than a matched or diverged transfer check.",
        expected: null,
        observed:
          simulation.error === null || simulation.error === undefined
            ? "failure without error object"
            : JSON.stringify(simulation.error),
        evidence: { unitsConsumed: simulation.unitsConsumed },
      }),
    );
  }

  observeInstructionEffects(transaction, simulation, expectedEffects, observations);
  observeLamportDeltas(transaction, simulation, expectedEffects, observations);

  if (observations.length === 0) {
    observations.push(
      obs({
        id: "no_comparable_effects",
        status: "not_applicable",
        title: "No comparable effects",
        explanation:
          "No decoded effects produced a concrete comparison against this simulation preview.",
        expected: null,
        observed: null,
      }),
    );
  }

  observations.sort((left, right) => left.id.localeCompare(right.id));

  return {
    expectedEffects,
    observations,
    summary: summarize(observations),
    note: BEHAVIOR_COMPARISON_NOTE,
  };
}

/**
 * Normalize, simulate, then compare decoded expectations to the simulation preview.
 * Requires RPC. Observations are not a safety verdict.
 */
export async function compareNormalizedTransaction(
  input: TransactionInput,
  options: SimulateOptions,
): Promise<ComparedTransactionView> {
  const { transaction, simulation } = await simulateNormalizedTransaction(input, options);
  return {
    transaction,
    simulation,
    comparison: compareExpectedToSimulated(transaction, simulation),
  };
}
