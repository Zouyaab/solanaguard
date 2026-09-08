import type { FastifyBaseLogger, FastifyInstance } from "fastify";
import { createErrorTracker } from "./error-tracking.js";

/** Paths that must never appear in structured logs. */
export const LOG_REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['x-api-key']",
  "req.body.privateKey",
  "req.body.private_key",
  "req.body.secretKey",
  "req.body.secret_key",
  "req.body.seed",
  "req.body.seedPhrase",
  "req.body.seed_phrase",
  "req.body.mnemonic",
  "req.body.password",
  "req.body.passphrase",
  "req.body.recoveryPhrase",
  "req.body.recovery_phrase",
  "req.body.walletPassword",
] as const;

export interface LoggerOptionsInput {
  level?: string;
  /** When true, use Fastify's default pretty-capable logger. */
  enabled?: boolean;
  /** Optional destination stream (tests). */
  stream?: { write(chunk: string): void } | undefined;
}

/**
 * Build Fastify logger config with redaction and configurable level.
 * Defaults to info. Secrets and auth headers are redacted.
 */
export function createLoggerConfig(input: LoggerOptionsInput = {}): boolean | object {
  if (input.enabled === false) {
    return false;
  }
  const level = input.level?.trim() || "info";
  const base: Record<string, unknown> = {
    level,
    redact: {
      paths: [...LOG_REDACT_PATHS],
      censor: "[Redacted]",
    },
  };
  if (input.stream) {
    base.stream = input.stream;
  }
  return base;
}

export interface StructuredErrorFields {
  requestId: string;
  route: string;
  method: string;
  statusCode: number;
  errMessage: string;
}

export function logServerError(
  log: FastifyBaseLogger,
  fields: StructuredErrorFields,
  error: unknown,
): void {
  const err =
    error instanceof Error
      ? { type: error.name, message: error.message }
      : { type: "unknown", message: String(error) };
  log.error(
    {
      requestId: fields.requestId,
      route: fields.route,
      method: fields.method,
      statusCode: fields.statusCode,
      err,
    },
    "request failed with server error",
  );
}

/**
 * Register an error handler that logs 5xx with request metadata.
 * Response bodies stay free of stack traces. Rate-limit and validation shapes are preserved.
 */
export function registerStructuredErrorLogging(app: FastifyInstance): void {
  const tracker = createErrorTracker(app.log);
  app.setErrorHandler((error, request, reply) => {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : 500;

    if (statusCode >= 500) {
      tracker.captureException(error, {
        requestId: request.id,
        route: request.routeOptions.url ?? request.url,
        method: request.method,
        statusCode,
      });
    }

    if (reply.sent) {
      return;
    }

    if (statusCode === 429) {
      const rateError =
        typeof error === "object" && error !== null && "error" in error
          ? String((error as { error: unknown }).error)
          : "rate_limited";
      return reply.code(429).send({
        statusCode: 429,
        error: rateError,
        message: error instanceof Error ? error.message : "Too many requests.",
      });
    }

    if (
      statusCode === 400 &&
      typeof error === "object" &&
      error !== null &&
      "validation" in error
    ) {
      return reply.code(400).send({
        error: "invalid_request",
        message: error instanceof Error ? error.message : "Invalid request.",
      });
    }

    const message =
      statusCode >= 500
        ? "Internal server error"
        : error instanceof Error
          ? error.message
          : "Request failed";

    return reply.code(statusCode).send({
      error: statusCode >= 500 ? "internal" : "request_error",
      message,
    });
  });
}
