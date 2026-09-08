/**
 * Lightweight error-tracking abstraction for unexpected server failures.
 * Uses structured logging today; can swap in an external provider later.
 */

import type { FastifyBaseLogger } from "fastify";
import { logServerError } from "./logging.js";

export interface ErrorTrackingContext {
  requestId: string;
  route: string;
  method: string;
  statusCode: number;
}

export interface CapturedErrorEvent {
  requestId: string;
  route: string;
  method: string;
  statusCode: number;
  errorType: string;
  message: string;
}

export interface ErrorTracker {
  captureException(error: unknown, context: ErrorTrackingContext): void;
}

const SENSITIVE_PATTERN =
  /private[_-]?key|secret[_-]?key|mnemonic|seed[_-]?phrase|authorization|x-api-key|password|passphrase|recovery[_-]?phrase/i;

function safeMessage(error: unknown): { errorType: string; message: string } {
  if (error instanceof Error) {
    return {
      errorType: error.name,
      message: SENSITIVE_PATTERN.test(error.message) ? "[redacted]" : error.message,
    };
  }
  const raw = String(error);
  return {
    errorType: "unknown",
    message: SENSITIVE_PATTERN.test(raw) ? "[redacted]" : raw,
  };
}

/**
 * Create an error tracker backed by the Fastify/Pino logger.
 * Never includes request bodies, private keys, or RPC credentials.
 */
export function createErrorTracker(log: FastifyBaseLogger): ErrorTracker {
  return {
    captureException(error: unknown, context: ErrorTrackingContext): void {
      if (context.statusCode < 500) {
        return;
      }
      const { errorType, message } = safeMessage(error);
      logServerError(
        log,
        {
          requestId: context.requestId,
          route: context.route,
          method: context.method,
          statusCode: context.statusCode,
          errMessage: message,
        },
        error instanceof Error
          ? Object.assign(new Error(message), { name: errorType })
          : new Error(message),
      );
      // Structured breadcrumb for future provider adapters (Sentry, etc.).
      log.error(
        {
          event: "error_tracking.capture",
          requestId: context.requestId,
          route: context.route,
          method: context.method,
          statusCode: context.statusCode,
          errorType,
          message,
        } satisfies CapturedErrorEvent & { event: string },
        "error_tracking.capture",
      );
    },
  };
}

/** In-memory tracker for unit tests and local verification. */
export function createMemoryErrorTracker(): ErrorTracker & { events: CapturedErrorEvent[] } {
  const events: CapturedErrorEvent[] = [];
  return {
    events,
    captureException(error: unknown, context: ErrorTrackingContext): void {
      if (context.statusCode < 500) {
        return;
      }
      const { errorType, message } = safeMessage(error);
      events.push({
        requestId: context.requestId,
        route: context.route,
        method: context.method,
        statusCode: context.statusCode,
        errorType,
        message,
      });
    },
  };
}
