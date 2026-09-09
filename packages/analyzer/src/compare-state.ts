import type {
  ComparisonObservation,
  ComparisonStatus,
  ExpectedEffect,
  NormalizedTransaction,
  SimulationReport,
} from "@solanaguard/types";
import { netExpectedLamports } from "./compare-effects.js";
import { obs, parseAmount, postAccount, preLamports } from "./compare-helpers.js";

export function observeLamportDeltas(
  transaction: NormalizedTransaction,
  simulation: SimulationReport,
  expectedEffects: readonly ExpectedEffect[],
  observations: ComparisonObservation[],
): void {
  if (!simulation.success) {
    return;
  }

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
        expectedDelta <= 0n ? observedDelta <= expectedDelta : observedDelta === expectedDelta;
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

    const status: ComparisonStatus = observedDelta === expectedDelta ? "matched" : "diverged";
    observations.push(
      obs({
        id: `lamports_${address}`,
        status,
        title: status === "matched" ? "Lamport delta matched" : "Lamport delta diverged",
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
