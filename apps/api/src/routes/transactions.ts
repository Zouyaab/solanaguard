import type { FastifyInstance } from "fastify";
import { evaluateAndScore, evaluateRules } from "@solanaguard/risk-engine";
import { errorResponseSchema, transactionInputBodySchema } from "../schemas.js";
import { normalizeFromBody, simulateOrCompareFromBody } from "../transaction-handlers.js";
import type { ApiRouteContext } from "./types.js";

export function registerTransactionRoutes(app: FastifyInstance, ctx: ApiRouteContext): void {
  const { rpc } = ctx;

  app.post(
    "/api/v1/transactions/normalize",
    {
      schema: {
        tags: ["transactions"],
        summary: "Normalize a transaction",
        body: transactionInputBodySchema,
        response: { 400: errorResponseSchema, 503: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const transaction = await normalizeFromBody(request.body, reply, rpc);
      if (!transaction) {
        return;
      }
      return { transaction };
    },
  );

  app.post(
    "/api/v1/transactions/evaluate-rules",
    {
      schema: {
        tags: ["transactions"],
        summary: "Evaluate deterministic rules (findings only)",
        body: transactionInputBodySchema,
        response: { 400: errorResponseSchema, 503: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const transaction = await normalizeFromBody(request.body, reply, rpc);
      if (!transaction) {
        return;
      }
      return { transaction, evaluation: evaluateRules(transaction) };
    },
  );

  app.post(
    "/api/v1/transactions/score",
    {
      schema: {
        tags: ["transactions"],
        summary: "Evaluate rules and return a transparent score",
        body: transactionInputBodySchema,
        response: { 400: errorResponseSchema, 503: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const transaction = await normalizeFromBody(request.body, reply, rpc);
      if (!transaction) {
        return;
      }
      const { evaluation, score } = evaluateAndScore(transaction);
      return { transaction, evaluation, score };
    },
  );

  app.post(
    "/api/v1/transactions/simulate",
    {
      schema: {
        tags: ["transactions"],
        summary: "Simulate a transaction (cluster preview)",
        body: transactionInputBodySchema,
        response: { 400: errorResponseSchema, 503: errorResponseSchema },
      },
    },
    async (request, reply) => {
      return simulateOrCompareFromBody(request.body, reply, "simulate", rpc);
    },
  );

  app.post(
    "/api/v1/transactions/compare",
    {
      schema: {
        tags: ["transactions"],
        summary: "Compare expected effects to simulation",
        body: transactionInputBodySchema,
        response: { 400: errorResponseSchema, 503: errorResponseSchema },
      },
    },
    async (request, reply) => {
      return simulateOrCompareFromBody(request.body, reply, "compare", rpc);
    },
  );
}
