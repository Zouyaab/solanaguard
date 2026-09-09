import type {
  ComparisonObservation,
  ComparisonStatus,
  ExpectedEffect,
  NormalizedTransaction,
  SimulationReport,
} from "@solanaguard/types";
import { obs, parseAmount, postAccount } from "./compare-helpers.js";

export function observeInstructionEffects(
  transaction: NormalizedTransaction,
  simulation: SimulationReport,
  expectedEffects: readonly ExpectedEffect[],
  observations: ComparisonObservation[],
): void {
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
          title: status === "matched" ? "Owner assignment matched" : "Owner assignment diverged",
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
}
