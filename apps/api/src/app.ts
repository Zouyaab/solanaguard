import Fastify, { type FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import rateLimit from "@fastify/rate-limit";
import {
  DEFAULT_API_BODY_LIMIT_BYTES,
  DEFAULT_API_REQUEST_TIMEOUT_MS,
  DEFAULT_RATE_LIMIT_MAX,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
} from "@solanaguard/config";
import { SOLANAGUARD_VERSION } from "@solanaguard/types";
import type { SolanaRpc } from "@solanaguard/solana";
import { findForbiddenSecretField } from "./hardening.js";
import { createLoggerConfig, registerStructuredErrorLogging } from "./logging.js";
import { MetricsRegistry, registerMetrics } from "./metrics.js";
import { registerAnalyzeRoutes } from "./routes/analyze.js";
import { registerRpcRoutes } from "./routes/rpc.js";
import { registerSystemRoutes } from "./routes/system.js";
import { registerTransactionRoutes } from "./routes/transactions.js";
import type { ApiRouteContext } from "./routes/types.js";

export interface HardeningOptions {
  bodyLimitBytes?: number;
  requestTimeoutMs?: number;
  rateLimitMax?: number;
  rateLimitTimeWindowMs?: number;
  /** When false, skips @fastify/rate-limit registration (tests). Default true. */
  enableRateLimit?: boolean;
}

export interface AppOptions {
  /** Legacy boolean, or structured logger options. Default false in tests. */
  logger?: boolean | { level?: string; stream?: { write(chunk: string): void } };
  logLevel?: string;
  rpc?: SolanaRpc;
  hardening?: HardeningOptions;
  /** Shared metrics registry (tests can inject). */
  metrics?: MetricsRegistry;
  /** When false, skips metrics hooks (rare). Default true. */
  enableMetrics?: boolean;
}

export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const hardening = options.hardening ?? {};
  const bodyLimit = hardening.bodyLimitBytes ?? DEFAULT_API_BODY_LIMIT_BYTES;
  const requestTimeoutMs = hardening.requestTimeoutMs ?? DEFAULT_API_REQUEST_TIMEOUT_MS;
  const enableRateLimit = hardening.enableRateLimit !== false;
  const metrics = options.metrics ?? new MetricsRegistry();

  let loggerConfig: boolean | object = false;
  if (options.logger === true) {
    loggerConfig = createLoggerConfig({ level: options.logLevel ?? "info" });
  } else if (options.logger && typeof options.logger === "object") {
    const loggerInput: { level?: string; stream?: { write(chunk: string): void } } = {
      level: options.logger.level ?? options.logLevel ?? "info",
    };
    if (options.logger.stream) {
      loggerInput.stream = options.logger.stream;
    }
    loggerConfig = createLoggerConfig(loggerInput);
  } else if (typeof options.logLevel === "string") {
    loggerConfig = createLoggerConfig({ level: options.logLevel });
  }

  const app = Fastify({
    logger: loggerConfig,
    bodyLimit,
    requestTimeout: requestTimeoutMs,
    requestIdHeader: "x-request-id",
    genReqId: (req) => {
      const header = req.headers["x-request-id"];
      if (typeof header === "string" && header.trim()) {
        return header.trim().slice(0, 128);
      }
      return `sg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    },
  });
  const rpc = options.rpc;

  registerStructuredErrorLogging(app);
  if (options.enableMetrics !== false) {
    registerMetrics(app, metrics);
  }

  if (enableRateLimit) {
    await app.register(rateLimit, {
      global: true,
      max: hardening.rateLimitMax ?? DEFAULT_RATE_LIMIT_MAX,
      timeWindow: hardening.rateLimitTimeWindowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS,
      addHeaders: {
        "x-ratelimit-limit": true,
        "x-ratelimit-remaining": true,
        "x-ratelimit-reset": true,
        "retry-after": true,
      },
      errorResponseBuilder: (_request, context) => ({
        statusCode: 429,
        error: "rate_limited",
        message: `Too many requests. Try again after ${String(context.after)}.`,
      }),
    });
  }

  app.addHook("preValidation", async (request, reply) => {
    if (request.method !== "POST") {
      return;
    }
    const forbidden = findForbiddenSecretField(request.body);
    if (forbidden) {
      return reply.code(400).send({
        error: "forbidden_field",
        message:
          `Field ${JSON.stringify(forbidden)} is not accepted. ` +
          "SolanaGuard never collects private keys, seed phrases, or wallet passwords.",
      });
    }
  });

  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "SolanaGuard API",
        description:
          "Transaction analysis and simulation for Solana. Reports are not safety verdicts. " +
          "Do not treat scores, matched comparisons, or successful simulations as proof a transaction is safe. " +
          "This API never accepts private keys, seed phrases, or wallet passwords.",
        version: SOLANAGUARD_VERSION,
      },
      servers: [{ url: "http://127.0.0.1:3001", description: "Local development" }],
      tags: [
        { name: "system", description: "Process health, version, and metrics" },
        { name: "rpc", description: "Read-only Solana RPC helpers" },
        { name: "transactions", description: "Normalize, rules, score, simulate, compare" },
        { name: "analyze", description: "Composed analysis report" },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/documentation",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });

  const ctx: ApiRouteContext = { metrics };
  if (rpc) {
    ctx.rpc = rpc;
  }

  registerSystemRoutes(app, ctx);
  registerRpcRoutes(app, ctx);
  registerTransactionRoutes(app, ctx);
  registerAnalyzeRoutes(app, ctx);

  return app;
}
