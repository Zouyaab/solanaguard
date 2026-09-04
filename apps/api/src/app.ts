import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import rateLimit from "@fastify/rate-limit";
import {
  classifyAddress,
  compareNormalizedTransaction,
  normalizeTransaction,
  simulateNormalizedTransaction,
  TransactionNotFoundError,
  type TransactionInput,
} from "@solanaguard/analyzer";
import { evaluateAndScore, evaluateRules } from "@solanaguard/risk-engine";
import {
  DEFAULT_API_BODY_LIMIT_BYTES,
  DEFAULT_API_REQUEST_TIMEOUT_MS,
  DEFAULT_RATE_LIMIT_MAX,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
} from "@solanaguard/config";
import {
  SOLANAGUARD_NAME,
  SOLANAGUARD_VERSION,
  type HealthStatus,
  type NormalizedTransaction,
} from "@solanaguard/types";
import {
  InvalidAddressError,
  InvalidTransactionError,
  RpcRequestError,
  type NormalizedAccount,
  type SolanaRpc,
} from "@solanaguard/solana";
import { analyzeTransaction, TRANSACTION_ANALYSIS_NOTE } from "./analysis.js";
import {
  findForbiddenSecretField,
  validateTransactionBase64,
} from "./hardening.js";
import {
  addressParamSchema,
  errorResponseSchema,
  programIdParamSchema,
  signatureParamSchema,
  transactionInputBodySchema,
} from "./schemas.js";

export interface HardeningOptions {
  bodyLimitBytes?: number;
  requestTimeoutMs?: number;
  rateLimitMax?: number;
  rateLimitTimeWindowMs?: number;
  /** When false, skips @fastify/rate-limit registration (tests). Default true. */
  enableRateLimit?: boolean;
}

export interface AppOptions {
  logger?: boolean;
  rpc?: SolanaRpc;
  hardening?: HardeningOptions;
}

function jsonAccount(account: NormalizedAccount) {
  const curve = classifyAddress(account.address);
  return {
    address: account.address,
    lamports: account.lamports.toString(),
    owner: account.owner,
    executable: account.executable,
    rentEpoch: account.rentEpoch?.toString() ?? null,
    dataLength: account.dataLength,
    dataBase64: account.dataBase64,
    onCurve: curve.onCurve,
    curveClass: curve.curveClass,
  };
}

function sendRpcError(reply: FastifyReply, error: unknown) {
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
  const message = error instanceof Error ? error.message : "Unknown error";
  return reply.code(500).send({ error: "internal", message });
}

interface ParsedTransactionFields {
  base64?: string;
  signature?: string;
  includeSimulation?: boolean;
}

function parseTransactionFields(
  body: unknown,
): ParsedTransactionFields | { error: string } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { error: "JSON body must be an object with base64 or signature." };
  }
  const record = body as Record<string, unknown>;
  const base64 = record.base64;
  const signature = record.signature;
  if (typeof base64 === "string" && typeof signature === "string") {
    return { error: "Provide either base64 or signature, not both." };
  }
  if (typeof base64 !== "string" && typeof signature !== "string") {
    return { error: "JSON body must include string field base64 or signature." };
  }
  if (
    record.includeSimulation !== undefined &&
    typeof record.includeSimulation !== "boolean"
  ) {
    return { error: "includeSimulation must be a boolean when provided." };
  }
  const fields: ParsedTransactionFields = {};
  if (typeof base64 === "string") {
    const sizeError = validateTransactionBase64(base64);
    if (sizeError) {
      return { error: sizeError };
    }
    fields.base64 = base64;
  }
  if (typeof signature === "string") {
    fields.signature = signature;
  }
  if (typeof record.includeSimulation === "boolean") {
    fields.includeSimulation = record.includeSimulation;
  }
  return fields;
}

function toTransactionInput(fields: ParsedTransactionFields): TransactionInput | null {
  if (typeof fields.base64 === "string") {
    return { source: "base64", base64: fields.base64 };
  }
  if (typeof fields.signature === "string") {
    return { source: "signature", signature: fields.signature };
  }
  return null;
}

function isSignatureInput(
  input: TransactionInput,
): input is { source: "signature"; signature: string } {
  return (
    typeof input === "object" &&
    !(input instanceof Uint8Array) &&
    "source" in input &&
    input.source === "signature"
  );
}

export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const hardening = options.hardening ?? {};
  const bodyLimit = hardening.bodyLimitBytes ?? DEFAULT_API_BODY_LIMIT_BYTES;
  const requestTimeoutMs = hardening.requestTimeoutMs ?? DEFAULT_API_REQUEST_TIMEOUT_MS;
  const enableRateLimit = hardening.enableRateLimit !== false;

  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit,
    requestTimeout: requestTimeoutMs,
  });
  const rpc = options.rpc;

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
        { name: "system", description: "Process health and version" },
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

  app.get(
    "/api/v1/health",
    {
      config: { rateLimit: false },
      schema: {
        tags: ["system"],
        summary: "Process health",
        description: "Reports that the HTTP process is running. Does not imply Solana RPC reachability.",
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

  app.get(
    "/api/v1/rpc/status",
    {
      schema: {
        tags: ["rpc"],
        summary: "Configured Solana RPC reachability",
        response: {
          200: {
            type: "object",
            additionalProperties: true,
          },
          502: {
            type: "object",
            additionalProperties: true,
          },
          503: errorResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      if (!rpc) {
        return reply.code(503).send({
          error: "rpc_not_configured",
          message: "This process was started without a Solana RPC client.",
        });
      }
      const status = await rpc.getStatus();
      if (!status.reachable) {
        return reply.code(502).send(status);
      }
      return reply.code(200).send(status);
    },
  );

  app.get<{ Params: { address: string } }>(
    "/api/v1/account/:address",
    {
      schema: {
        tags: ["rpc"],
        summary: "Fetch a Solana account",
        description:
          "Returns account data when present. Missing accounts are not risk findings.",
        params: addressParamSchema,
        response: {
          400: errorResponseSchema,
          404: errorResponseSchema,
          503: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!rpc) {
        return reply.code(503).send({
          error: "rpc_not_configured",
          message: "This process was started without a Solana RPC client.",
        });
      }
      try {
        const account = await rpc.getAccount(request.params.address);
        if (!account) {
          return reply.code(404).send({
            found: false,
            address: request.params.address,
            message: "No account exists at this address on the configured cluster.",
          });
        }
        return { found: true, account: jsonAccount(account) };
      } catch (error) {
        return sendRpcError(reply, error);
      }
    },
  );

  app.get<{ Params: { programId: string } }>(
    "/api/v1/program/:programId",
    {
      schema: {
        tags: ["rpc"],
        summary: "Fetch a program account",
        description:
          "Looks up the program id as an account. executable=false means the address is not an on-chain program on this cluster — not evidence of malice.",
        params: programIdParamSchema,
        response: {
          400: errorResponseSchema,
          404: errorResponseSchema,
          503: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!rpc) {
        return reply.code(503).send({
          error: "rpc_not_configured",
          message: "This process was started without a Solana RPC client.",
        });
      }
      try {
        const account = await rpc.getAccount(request.params.programId);
        if (!account) {
          return reply.code(404).send({
            found: false,
            programId: request.params.programId,
            message: "No account exists at this program id on the configured cluster.",
          });
        }
        return {
          found: true,
          programId: request.params.programId,
          executable: account.executable,
          account: jsonAccount(account),
          note: account.executable
            ? "Account is marked executable on this cluster. That is not a safety verdict."
            : "Account exists but is not marked executable on this cluster. That is incomplete program coverage, not evidence of malice.",
        };
      } catch (error) {
        return sendRpcError(reply, error);
      }
    },
  );

  app.get<{ Params: { signature: string } }>(
    "/api/v1/transaction/:signature",
    {
      schema: {
        tags: ["rpc"],
        summary: "Fetch a confirmed transaction",
        params: signatureParamSchema,
        response: {
          400: errorResponseSchema,
          404: errorResponseSchema,
          503: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      if (!rpc) {
        return reply.code(503).send({
          error: "rpc_not_configured",
          message: "This process was started without a Solana RPC client.",
        });
      }
      try {
        const transaction = await rpc.getTransaction(request.params.signature);
        if (!transaction) {
          return reply.code(404).send({
            found: false,
            signature: request.params.signature,
            message: "No confirmed transaction with this signature on the configured cluster.",
          });
        }
        return { found: true, transaction };
      } catch (error) {
        return sendRpcError(reply, error);
      }
    },
  );

  async function normalizeFromBody(
    body: unknown,
    reply: FastifyReply,
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
      const transaction = await normalizeFromBody(request.body, reply);
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
      const transaction = await normalizeFromBody(request.body, reply);
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
      const transaction = await normalizeFromBody(request.body, reply);
      if (!transaction) {
        return;
      }
      const { evaluation, score } = evaluateAndScore(transaction);
      return { transaction, evaluation, score };
    },
  );

  async function simulateOrCompareFromBody(
    body: unknown,
    reply: FastifyReply,
    mode: "simulate" | "compare",
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
      return simulateOrCompareFromBody(request.body, reply, "simulate");
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
      return simulateOrCompareFromBody(request.body, reply, "compare");
    },
  );

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
        return await analyzeTransaction(input, analyzeOptions);
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
      return simulateOrCompareFromBody(request.body, reply, "simulate");
    },
  );

  return app;
}
