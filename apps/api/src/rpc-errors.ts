import type { FastifyReply } from "fastify";
import { TransactionNotFoundError } from "@solanaguard/analyzer";
import { InvalidAddressError, InvalidTransactionError, RpcRequestError } from "@solanaguard/solana";
import { createErrorTracker } from "./error-tracking.js";

/**
 * Map known domain errors to stable 4xx/5xx JSON bodies.
 * Never includes stack traces. Logs 5xx with request metadata only.
 */
export function sendRpcError(reply: FastifyReply, error: unknown) {
  if (error instanceof TransactionNotFoundError) {
    return reply.code(404).send({
      found: false,
      signature: error.signature,
      message: error.message,
    });
  }
  if (error instanceof InvalidAddressError || error instanceof InvalidTransactionError) {
    return reply.code(400).send({ error: "invalid_request", message: error.message });
  }
  if (error instanceof RpcRequestError) {
    return reply.code(502).send({ error: "rpc_failed", message: error.message });
  }
  const request = reply.request;
  if (request) {
    createErrorTracker(request.log).captureException(error, {
      requestId: request.id,
      route: request.routeOptions.url ?? request.url,
      method: request.method,
      statusCode: 500,
    });
  }
  return reply.code(500).send({ error: "internal", message: "Internal server error" });
}
