import type { ExpectedEffect, NormalizedTransaction } from "@solanaguard/types";
import { asAmountString, namedAddress, parseAmount } from "./compare-helpers.js";

/** Derive expected effects from decoded instructions only. Pure. */
export function deriveExpectedEffects(transaction: NormalizedTransaction): ExpectedEffect[] {
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
        detail: "Instruction was not decoded, so no concrete expected effect could be derived.",
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

    if (instruction.programName === "system_program" && instruction.instructionType === "Create") {
      const lamports = asAmountString(instruction.args.lamports);
      const from = namedAddress(instruction, "from");
      const created = namedAddress(instruction, "newAccount");
      const owner = typeof instruction.args.owner === "string" ? instruction.args.owner : null;
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

    if (instruction.programName === "system_program" && instruction.instructionType === "Assign") {
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
      (instruction.programName === "spl_token" || instruction.programName === "spl_token_2022") &&
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
      (instruction.programName === "spl_token" || instruction.programName === "spl_token_2022") &&
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

export function netExpectedLamports(effects: readonly ExpectedEffect[]): Map<string, bigint> {
  const nets = new Map<string, bigint>();
  for (const effect of effects) {
    if ((effect.kind !== "lamport_debit" && effect.kind !== "lamport_credit") || !effect.address) {
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
