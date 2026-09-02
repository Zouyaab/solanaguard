import type {
  BehaviorComparison,
  ComparisonObservation,
  ComparisonStatus,
  ExpectedEffect,
  NormalizedCompiledInstruction,
  NormalizedTransaction,
  ResolvedAccountSnapshot,
  SimulatedAccountView,
  SimulationReport,
} from "@solanaguard/types";
import {
  simulateNormalizedTransaction,
  type SimulateOptions,
  type SimulatedTransactionView,
} from "./simulate.js";
import type { TransactionInput } from "./normalize.js";

export interface ComparedTransactionView extends SimulatedTransactionView {
  comparison: BehaviorComparison;
}

export const BEHAVIOR_COMPARISON_NOTE =
  "These observations compare decoded instruction effects to a cluster simulation preview. " +
  "They are not a safety verdict, not a proof of attack, and not a substitute for review. " +
  "Simulation can differ from later execution (slot, blockhash, fees, competing transactions, program upgrades).";

function namedAddress(
  instruction: NormalizedCompiledInstruction,
  name: string,
): string | null {
  return instruction.namedAccounts.find((account) => account.name === name)?.address ?? null;
}

function asAmountString(value: unknown): string | null {
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return null;
}

function parseAmount(value: string | null | undefined): bigint | null {
  if (value === null || value === undefined || !/^-?\d+$/.test(value)) {
    return null;
  }
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function obs(
  partial: Omit<ComparisonObservation, "evidence"> & {
    evidence?: ComparisonObservation["evidence"];
  },
): ComparisonObservation {
  return { ...partial, evidence: partial.evidence ?? {} };
}

function summarize(
  observations: readonly ComparisonObservation[],
): BehaviorComparison["summary"] {
  const summary = { matched: 0, diverged: 0, incomplete: 0, notApplicable: 0 };
  for (const item of observations) {
    if (item.status === "matched") summary.matched += 1;
    else if (item.status === "diverged") summary.diverged += 1;
    else if (item.status === "incomplete") summary.incomplete += 1;
    else summary.notApplicable += 1;
  }
  return summary;
}

function preLamports(
  snapshots: readonly ResolvedAccountSnapshot[],
  address: string,
): bigint | null {
  const snapshot = snapshots.find((item) => item.address === address);
  if (!snapshot || snapshot.presence !== "found") {
    return null;
  }
  return parseAmount(snapshot.lamports);
}

function postAccount(
  accounts: readonly SimulatedAccountView[],
  address: string,
): SimulatedAccountView | undefined {
  return accounts.find((item) => item.address === address);
}

/** Derive expected effects from decoded instructions only. Pure. */
export function deriveExpectedEffects(
  transaction: NormalizedTransaction,
): ExpectedEffect[] {
  const effects: ExpectedEffect[] = [];

  for (const instruction of transaction.instructions) {
    const base = {
      instructionIndex: instruction.index,
      programId: instruction.programId,
      instructionType: instruction.instructionType,
    };

    if (!instruction.decoded || instruction.instructionType === null) {
      effects.push({
        ...base,
        kind: "undecoded_instruction",
        address: null,
        amount: null,
        detail:
          "Instruction was not decoded, so no concrete expected effect could be derived.",
      });
      continue;
    }

    if (
      instruction.programName === "system_program" &&
      instruction.instructionType === "Transfer"
    ) {
      const lamports = asAmountString(instruction.args.lamports);
      const from = namedAddress(instruction, "from");
      const to = namedAddress(instruction, "to");
      if (from) {
        effects.push({
          ...base,
          kind: "lamport_debit",
          address: from,
          amount: lamports,
          detail: `System Transfer expects ${lamports ?? "unknown"} lamports debited from ${from}.`,
        });
      }
      if (to) {
        effects.push({
          ...base,
          kind: "lamport_credit",
          address: to,
          amount: lamports,
          detail: `System Transfer expects ${lamports ?? "unknown"} lamports credited to ${to}.`,
        });
      }
      continue;
    }

    if (
      instruction.programName === "system_program" &&
      instruction.instructionType === "Create"
    ) {
      const lamports = asAmountString(instruction.args.lamports);
      const from = namedAddress(instruction, "from");
      const created = namedAddress(instruction, "newAccount");
      const owner =
        typeof instruction.args.owner === "string" ? instruction.args.owner : null;
      if (from) {
        effects.push({
          ...base,
          kind: "lamport_debit",
          address: from,
          amount: lamports,
          detail: `System Create expects ${lamports ?? "unknown"} lamports debited from ${from}.`,
        });
      }
      if (created) {
        effects.push({
          ...base,
          kind: "lamport_credit",
          address: created,
          amount: lamports,
          detail: `System Create expects ${lamports ?? "unknown"} lamports credited to ${created}.`,
        });
        effects.push({
          ...base,
          kind: "owner_assign",
          address: created,
          amount: null,
          detail: `System Create expects owner ${owner ?? "unknown"} on ${created}.`,
        });
      }
      continue;
    }

    if (
      instruction.programName === "system_program" &&
      instruction.instructionType === "Assign"
    ) {
      effects.push({
        ...base,
        kind: "owner_assign",
        address: namedAddress(instruction, "account"),
        amount: null,
        detail: `System Assign expects owner ${
          typeof instruction.args.owner === "string" ? instruction.args.owner : "unknown"
        } on ${namedAddress(instruction, "account") ?? "unknown"}.`,
      });
      continue;
    }

    if (
      (instruction.programName === "spl_token" ||
        instruction.programName === "spl_token_2022") &&
      (instruction.instructionType === "Transfer" ||
        instruction.instructionType === "TransferChecked")
    ) {
      effects.push({
        ...base,
        kind: "token_amount",
        address: namedAddress(instruction, "source"),
        amount: asAmountString(instruction.args.amount),
        detail: `SPL Token ${instruction.instructionType} moves ${
          asAmountString(instruction.args.amount) ?? "unknown"
        } from ${namedAddress(instruction, "source") ?? "unknown"} to ${
          namedAddress(instruction, "destination") ?? "unknown"
        }.`,
      });
      continue;
    }

    if (
      (instruction.programName === "spl_token" ||
        instruction.programName === "spl_token_2022") &&
      instruction.instructionType === "CloseAccount"
    ) {
      effects.push({
        ...base,
        kind: "account_close",
        address: namedAddress(instruction, "account"),
        amount: null,
        detail: `SPL Token CloseAccount expects ${
          namedAddress(instruction, "account") ?? "unknown"
        } to be closed.`,
      });
      continue;
    }

    effects.push({
      ...base,
      kind: "undecoded_instruction",
      address: null,
      amount: null,
      detail: `Decoded as ${instruction.programName ?? "unknown"}/${instruction.instructionType}, but no expected-effect mapping is defined yet.`,
    });
  }

  return effects;
}

function netExpectedLamports(effects: readonly ExpectedEffect[]): Map<string, bigint> {
  const nets = new Map<string, bigint>();
  for (const effect of effects) {
    if (
      (effect.kind !== "lamport_debit" && effect.kind !== "lamport_credit") ||
      !effect.address
    ) {
      continue;
    }
    const amount = parseAmount(effect.amount);
    if (amount === null) {
      continue;
    }
    const signed = effect.kind === "lamport_debit" ? -amount : amount;
    nets.set(effect.address, (nets.get(effect.address) ?? 0n) + signed);
  }
  return nets;
}

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

  for (const effect of expectedEffects) {
    if (effect.kind === "undecoded_instruction") {
      observations.push(
        obs({
          id: `undecoded_${effect.instructionIndex}`,
          status: "incomplete",
          title: "Undecoded or unmapped instruction",
          explanation: effect.detail,
          expected: null,
          observed: null,
          evidence: {
            instructionIndex: effect.instructionIndex,
            programId: effect.programId,
            instructionType: effect.instructionType,
          },
        }),
      );
      continue;
    }

    if (effect.kind === "token_amount") {
      observations.push(
        obs({
          id: `token_${effect.instructionIndex}`,
          status: "incomplete",
          title: "Token amount not fully compared",
          explanation: `${effect.detail} Post-simulation token account balances are not parsed yet, so the amount cannot be verified from lamport snapshots alone.`,
          expected: effect.amount,
          observed: simulation.success ? "simulation succeeded" : "simulation failed",
          evidence: {
            instructionIndex: effect.instructionIndex,
            address: effect.address,
            simulationSuccess: simulation.success,
          },
        }),
      );
      continue;
    }

    if (effect.kind === "account_close") {
      const address = effect.address;
      if (!address) {
        observations.push(
          obs({
            id: `close_missing_${effect.instructionIndex}`,
            status: "incomplete",
            title: "CloseAccount address missing",
            explanation: "CloseAccount was decoded without a resolvable account address.",
            expected: null,
            observed: null,
            evidence: { instructionIndex: effect.instructionIndex },
          }),
        );
        continue;
      }
      if (!simulation.success) {
        observations.push(
          obs({
            id: `close_sim_${effect.instructionIndex}`,
            status: "incomplete",
            title: "CloseAccount not verified",
            explanation: "Simulation failed, so post-state for the closed account is unavailable.",
            expected: "account closed or lamports emptied",
            observed: null,
            evidence: { address },
          }),
        );
        continue;
      }
      const post = postAccount(simulation.accounts, address);
      if (!post || !post.returned || post.lamports === null) {
        observations.push(
          obs({
            id: `close_incomplete_${effect.instructionIndex}`,
            status: "incomplete",
            title: "CloseAccount post-state missing",
            explanation: "Simulation did not return post-state for the account expected to close.",
            expected: "lamports 0 or account absent",
            observed: null,
            evidence: { address, accountsReturned: simulation.accountsReturned },
          }),
        );
        continue;
      }
      const postLamports = parseAmount(post.lamports);
      const status: ComparisonStatus = postLamports === 0n ? "matched" : "diverged";
      observations.push(
        obs({
          id: `close_${effect.instructionIndex}`,
          status,
          title:
            status === "matched"
              ? "CloseAccount post-lamports matched"
              : "CloseAccount post-lamports diverged",
          explanation:
            status === "matched"
              ? `Simulated post-state for ${address} shows 0 lamports, consistent with CloseAccount.`
              : `Simulated post-state for ${address} still shows ${post.lamports} lamports after CloseAccount.`,
          expected: "0",
          observed: post.lamports,
          evidence: { address, instructionIndex: effect.instructionIndex },
        }),
      );
      continue;
    }

    if (effect.kind === "owner_assign") {
      const address = effect.address;
      const instruction = transaction.instructions[effect.instructionIndex];
      const expectedOwner =
        typeof instruction?.args.owner === "string" ? instruction.args.owner : null;
      if (!address || !expectedOwner) {
        observations.push(
          obs({
            id: `owner_incomplete_${effect.instructionIndex}`,
            status: "incomplete",
            title: "Owner assignment incomplete",
            explanation: effect.detail,
            expected: expectedOwner,
            observed: null,
            evidence: { instructionIndex: effect.instructionIndex },
          }),
        );
        continue;
      }
      const post = postAccount(simulation.accounts, address);
      if (!simulation.success || !post?.returned || !post.owner) {
        observations.push(
          obs({
            id: `owner_missing_${effect.instructionIndex}`,
            status: "incomplete",
            title: "Owner post-state missing",
            explanation: `Expected owner ${expectedOwner} on ${address}, but simulation did not return a usable post-state owner.`,
            expected: expectedOwner,
            observed: post?.owner ?? null,
            evidence: { address, simulationSuccess: simulation.success },
          }),
        );
        continue;
      }
      const status: ComparisonStatus = post.owner === expectedOwner ? "matched" : "diverged";
      observations.push(
        obs({
          id: `owner_${effect.instructionIndex}`,
          status,
          title:
            status === "matched" ? "Owner assignment matched" : "Owner assignment diverged",
          explanation:
            status === "matched"
              ? `Simulated owner for ${address} matches expected ${expectedOwner}.`
              : `Simulated owner for ${address} is ${post.owner}, expected ${expectedOwner}.`,
          expected: expectedOwner,
          observed: post.owner,
          evidence: { address },
        }),
      );
    }
  }

  if (simulation.success) {
    const nets = netExpectedLamports(expectedEffects);
    for (const [address, expectedDelta] of nets) {
      const pre = preLamports(transaction.resolvedAccounts, address);
      const post = postAccount(simulation.accounts, address);
      if (pre === null) {
        observations.push(
          obs({
            id: `lamports_pre_${address}`,
            status: "incomplete",
            title: "Pre-state lamports missing",
            explanation: `No resolved pre-simulation lamports for ${address}, so the expected delta ${expectedDelta.toString()} could not be checked.`,
            expected: expectedDelta.toString(),
            observed: null,
            evidence: {
              address,
              accountResolutionAttempted: transaction.accountResolution.attempted,
            },
          }),
        );
        continue;
      }
      if (!post || !post.returned || post.lamports === null) {
        observations.push(
          obs({
            id: `lamports_post_${address}`,
            status: "incomplete",
            title: "Post-state lamports missing",
            explanation: `Simulation did not return post-state lamports for ${address}.`,
            expected: expectedDelta.toString(),
            observed: null,
            evidence: { address, accountsReturned: simulation.accountsReturned },
          }),
        );
        continue;
      }
      const postLamports = parseAmount(post.lamports);
      if (postLamports === null) {
        observations.push(
          obs({
            id: `lamports_bad_${address}`,
            status: "incomplete",
            title: "Post-state lamports unreadable",
            explanation: `Simulation returned a non-numeric lamports value for ${address}.`,
            expected: expectedDelta.toString(),
            observed: post.lamports,
            evidence: { address },
          }),
        );
        continue;
      }
      const observedDelta = postLamports - pre;
      if (address === transaction.feePayer) {
        const transferOnlyOk =
          expectedDelta <= 0n
            ? observedDelta <= expectedDelta
            : observedDelta === expectedDelta;
        observations.push(
          obs({
            id: `lamports_fee_payer_${address}`,
            status: transferOnlyOk ? "matched" : "diverged",
            title: transferOnlyOk
              ? "Fee-payer lamport delta consistent with fee"
              : "Fee-payer lamport delta diverged",
            explanation: transferOnlyOk
              ? `Fee payer ${address} moved by ${observedDelta.toString()} lamports; expected transfer delta ${expectedDelta.toString()} plus a transaction fee. Exact fee is not asserted.`
              : `Fee payer ${address} moved by ${observedDelta.toString()} lamports; that is not consistent with expected transfer delta ${expectedDelta.toString()} even after allowing an extra fee debit.`,
            expected: expectedDelta.toString(),
            observed: observedDelta.toString(),
            evidence: {
              address,
              preLamports: pre.toString(),
              postLamports: postLamports.toString(),
              feePayer: true,
            },
          }),
        );
        continue;
      }

      const status: ComparisonStatus =
        observedDelta === expectedDelta ? "matched" : "diverged";
      observations.push(
        obs({
          id: `lamports_${address}`,
          status,
          title:
            status === "matched" ? "Lamport delta matched" : "Lamport delta diverged",
          explanation:
            status === "matched"
              ? `Account ${address} changed by ${observedDelta.toString()} lamports, matching the decoded expectation.`
              : `Account ${address} changed by ${observedDelta.toString()} lamports; decoded instructions expected ${expectedDelta.toString()}.`,
          expected: expectedDelta.toString(),
          observed: observedDelta.toString(),
          evidence: {
            address,
            preLamports: pre.toString(),
            postLamports: postLamports.toString(),
          },
        }),
      );
    }
  }

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
