import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface MetricsSnapshot {
  requestsTotal: number;
  errorsTotal: number;
  /** Count of responses with status 400–499. */
  clientErrorTotal: number;
  /** Count of responses with status 500–599 (same as errorsTotal). */
  serverErrorTotal: number;
  /** Mean request duration in milliseconds since process start (0 if no samples). */
  requestDurationMsAvg: number;
  /** Max observed request duration in milliseconds. */
  requestDurationMsMax: number;
}

/**
 * In-process counters for lightweight API observability.
 * No labels that could include user payloads or secrets.
 */
export class MetricsRegistry {
  private requestsTotal = 0;
  private errorsTotal = 0;
  private clientErrorTotal = 0;
  private durationSumMs = 0;
  private durationMaxMs = 0;

  recordRequest(durationMs: number, statusCode: number): void {
    this.requestsTotal += 1;
    this.durationSumMs += durationMs;
    if (durationMs > this.durationMaxMs) {
      this.durationMaxMs = durationMs;
    }
    if (statusCode >= 500) {
      this.errorsTotal += 1;
    } else if (statusCode >= 400) {
      this.clientErrorTotal += 1;
    }
  }

  /** Optional analysis-phase duration (milliseconds). Does not store payloads. */
  recordAnalysisDuration(durationMs: number): void {
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      return;
    }
    if (durationMs > this.durationMaxMs) {
      this.durationMaxMs = durationMs;
    }
  }

  snapshot(): MetricsSnapshot {
    return {
      requestsTotal: this.requestsTotal,
      errorsTotal: this.errorsTotal,
      clientErrorTotal: this.clientErrorTotal,
      serverErrorTotal: this.errorsTotal,
      requestDurationMsAvg: this.requestsTotal === 0 ? 0 : this.durationSumMs / this.requestsTotal,
      requestDurationMsMax: this.durationMaxMs,
    };
  }

  reset(): void {
    this.requestsTotal = 0;
    this.errorsTotal = 0;
    this.clientErrorTotal = 0;
    this.durationSumMs = 0;
    this.durationMaxMs = 0;
  }
}

export function registerMetrics(app: FastifyInstance, registry: MetricsRegistry): void {
  const startedAt = new WeakMap<FastifyRequest, number>();

  app.addHook("onRequest", async (request) => {
    startedAt.set(request, Date.now());
  });

  app.addHook("onResponse", async (request, reply: FastifyReply) => {
    const started = startedAt.get(request);
    const durationMs = typeof started === "number" ? Date.now() - started : 0;
    registry.recordRequest(durationMs, reply.statusCode);
  });
}
