import type { FastifyReply } from "fastify";
import {
  compareNormalizedTransaction,
  normalizeTransaction,
  simulateNormalizedTransaction,
} from "@solanaguard/analyzer";
import type { NormalizedTransaction } from "@solanaguard/types";
import type { SolanaRpc } from "@solanaguard/solana";
import { sendRpcError } from "./rpc-errors.js";
import {
  isSignatureInput,
  parseTransactionFields,
  toTransactionInput,
} from "./transaction-body.js";

export async function normalizeFromBody(
  body: unknown,
  reply: FastifyReply,
  rpc?: SolanaRpc,
): Promise<NormalizedTransaction | null> {
  const fields = parseTransactionFields(body);
  if ("error" in fields) {
    await reply.code(400).send({ error: "invalid_request", message: fields.error });
    return null;
  }
  const input = toTransactionInput(fields);
  if (!input) {
    await reply.code(400).send({
      error: "invalid_request",
      message: "JSON body must include string field base64 or signature.",
    });
    return null;
  }
  try {
    if (isSignatureInput(input) && !rpc) {
      await reply.code(503).send({
        error: "rpc_not_configured",
        message: "This process was started without a Solana RPC client.",
      });
      return null;
    }
    return await normalizeTransaction(input, rpc ? { rpc } : undefined);
  } catch (error) {
    await sendRpcError(reply, error);
    return null;
  }
}

export async function simulateOrCompareFromBody(
  body: unknown,
  reply: FastifyReply,
  mode: "simulate" | "compare",
  rpc?: SolanaRpc,
) {
  if (!rpc) {
    return reply.code(503).send({
      error: "rpc_not_configured",
      message: "This process was started without a Solana RPC client.",
    });
  }
  const fields = parseTransactionFields(body);
  if ("error" in fields) {
    return reply.code(400).send({ error: "invalid_request", message: fields.error });
  }
  const input = toTransactionInput(fields);
  if (!input) {
    return reply.code(400).send({
      error: "invalid_request",
      message: "JSON body must include string field base64 or signature.",
    });
  }
  try {
    if (mode === "compare") {
      return await compareNormalizedTransaction(input, { rpc });
    }
    return await simulateNormalizedTransaction(input, { rpc });
  } catch (error) {
    return sendRpcError(reply, error);
  }
}
