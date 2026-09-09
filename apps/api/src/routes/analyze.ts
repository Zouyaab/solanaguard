import type { FastifyInstance } from "fastify";
import type { SolanaRpc } from "@solanaguard/solana";
import { analyzeTransaction, TRANSACTION_ANALYSIS_NOTE } from "../analysis.js";
import { sendRpcError } from "../rpc-errors.js";
import { errorResponseSchema, transactionInputBodySchema } from "../schemas.js";
import {
  isSignatureInput,
  parseTransactionFields,
  toTransactionInput,
} from "../transaction-body.js";
import { simulateOrCompareFromBody } from "../transaction-handlers.js";
import type { ApiRouteContext } from "./types.js";

export function registerAnalyzeRoutes(app: FastifyInstance, ctx: ApiRouteContext): void {
  const { rpc } = ctx;

  app.post(
    "/api/v1/analyze/transaction",
    {
      schema: {
        tags: ["analyze"],
        summary: "Full transaction analysis report",
        description:
          "Normalizes the transaction, evaluates rules, scores findings, and when RPC is available " +
          "runs simulation plus expected-vs-simulated comparison. " +
          TRANSACTION_ANALYSIS_NOTE,
        body: transactionInputBodySchema,
        response: { 400: errorResponseSchema, 503: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const fields = parseTransactionFields(request.body);
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
      if (isSignatureInput(input) && !rpc) {
        return reply.code(503).send({
          error: "rpc_not_configured",
          message: "This process was started without a Solana RPC client.",
        });
      }
      try {
        const analyzeOptions: {
          rpc?: SolanaRpc;
          includeSimulation?: boolean;
        } = {};
        if (rpc) {
          analyzeOptions.rpc = rpc;
        }
        if (fields.includeSimulation !== undefined) {
          analyzeOptions.includeSimulation = fields.includeSimulation;
        }
        const started = Date.now();
        const report = await analyzeTransaction(input, analyzeOptions);
        ctx.metrics.recordAnalysisDuration(Date.now() - started);
        return report;
      } catch (error) {
        return sendRpcError(reply, error);
      }
    },
  );

  app.post(
    "/api/v1/simulate/transaction",
    {
      schema: {
        tags: ["analyze"],
        summary: "Simulate a transaction (Phase 11 path)",
        description:
          "Same behavior as POST /api/v1/transactions/simulate. Simulation is a cluster preview, not a safety verdict.",
        body: transactionInputBodySchema,
        response: { 400: errorResponseSchema, 503: errorResponseSchema },
      },
    },
    async (request, reply) => {
      return simulateOrCompareFromBody(request.body, reply, "simulate", rpc);
    },
  );
}
