import type { FastifyInstance } from "fastify";
import { SOLANAGUARD_NAME, SOLANAGUARD_VERSION, type HealthStatus } from "@solanaguard/types";
import type { ApiRouteContext } from "./types.js";

export function registerSystemRoutes(app: FastifyInstance, ctx: ApiRouteContext): void {
  const { metrics } = ctx;

  app.get(
    "/api/v1/health",
    {
      config: { rateLimit: false },
      schema: {
        tags: ["system"],
        summary: "Process health",
        description:
          "Reports that the HTTP process is running. Does not imply Solana RPC reachability.",
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["ok"] },
              service: { type: "string" },
              version: { type: "string" },
              time: { type: "string" },
            },
          },
        },
      },
    },
    async (): Promise<HealthStatus> => {
      return {
        status: "ok",
        service: SOLANAGUARD_NAME,
        version: SOLANAGUARD_VERSION,
        time: new Date().toISOString(),
      };
    },
  );

  app.get(
    "/api/v1/version",
    {
      config: { rateLimit: false },
      schema: {
        tags: ["system"],
        summary: "API version and phase",
        response: {
          200: {
            type: "object",
            properties: {
              name: { type: "string" },
              version: { type: "string" },
              phase: { type: "number" },
              note: { type: "string" },
            },
          },
        },
      },
    },
    async () => {
      return {
        name: SOLANAGUARD_NAME,
        version: SOLANAGUARD_VERSION,
        phase: 20,
        note:
          "Phase 20 completes MVP documentation (docs/README.md index). " +
          "Analysis reports are not a safety verdict.",
      };
    },
  );

  app.get(
    "/api/v1/metrics",
    {
      config: { rateLimit: false },
      schema: {
        tags: ["system"],
        summary: "Process metrics",
        description:
          "Lightweight in-process counters. Does not include request payloads, keys, or RPC credentials.",
        response: {
          200: {
            type: "object",
            properties: {
              requestsTotal: { type: "number" },
              errorsTotal: { type: "number" },
              clientErrorTotal: { type: "number" },
              serverErrorTotal: { type: "number" },
              requestDurationMsAvg: { type: "number" },
              requestDurationMsMax: { type: "number" },
            },
          },
        },
      },
    },
    async () => metrics.snapshot(),
  );

  app.get(
    "/api/v1/openapi.json",
    {
      config: { rateLimit: false },
      schema: {
        tags: ["system"],
        summary: "OpenAPI 3 document",
        hide: true,
      },
    },
    async () => app.swagger(),
  );
}
