import type { HealthStatus, TransactionAnalysisReport } from "@solanaguard/types";
import {
  SolanaGuardApiError,
  SolanaGuardNetworkError,
  SolanaGuardNotFoundError,
  type SolanaGuardErrorBody,
} from "./errors.js";
import { transactionRequestBody } from "./input.js";
import type {
  AccountLookupResponse,
  CompareResponse,
  EvaluateRulesResponse,
  NormalizeResponse,
  ProgramLookupResponse,
  RpcStatusResponse,
  ScoreResponse,
  SimulateResponse,
  SdkTransactionInput,
  SolanaGuardClientOptions,
  TransactionLookupResponse,
  VersionResponse,
} from "./types.js";

const DEFAULT_TIMEOUT_MS = 30_000;

function trimBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

async function readErrorBody(response: Response): Promise<SolanaGuardErrorBody | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as SolanaGuardErrorBody;
  } catch {
    return { message: text };
  }
}

/**
 * Typed HTTP client for the SolanaGuard REST API (Phase 12).
 *
 * Reports returned by this client are not safety verdicts.
 */
export class SolanaGuardClient {
  readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  constructor(options: SolanaGuardClientOptions) {
    if (!options.baseUrl.trim()) {
      throw new Error("SolanaGuardClient requires a non-empty baseUrl.");
    }
    this.baseUrl = trimBaseUrl(options.baseUrl.trim());
    this.fetchImpl = options.fetch ?? fetch;
    this.headers = { ...(options.headers ?? {}) };
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async health(): Promise<HealthStatus> {
    return this.requestJson<HealthStatus>("GET", "/api/v1/health");
  }

  async version(): Promise<VersionResponse> {
    return this.requestJson<VersionResponse>("GET", "/api/v1/version");
  }

  async rpcStatus(): Promise<RpcStatusResponse> {
    return this.requestJson<RpcStatusResponse>("GET", "/api/v1/rpc/status");
  }

  async getAccount(address: string): Promise<AccountLookupResponse> {
    return this.requestJson<AccountLookupResponse>(
      "GET",
      `/api/v1/account/${encodePathSegment(address)}`,
    );
  }

  async getProgram(programId: string): Promise<ProgramLookupResponse> {
    return this.requestJson<ProgramLookupResponse>(
      "GET",
      `/api/v1/program/${encodePathSegment(programId)}`,
    );
  }

  async getTransaction(signature: string): Promise<TransactionLookupResponse> {
    return this.requestJson<TransactionLookupResponse>(
      "GET",
      `/api/v1/transaction/${encodePathSegment(signature)}`,
    );
  }

  /** Composed normalize + rules + score + optional simulation/comparison. */
  async analyzeTransaction(input: SdkTransactionInput): Promise<TransactionAnalysisReport> {
    return this.requestJson<TransactionAnalysisReport>(
      "POST",
      "/api/v1/analyze/transaction",
      transactionRequestBody(input),
    );
  }

  async simulateTransaction(input: SdkTransactionInput): Promise<SimulateResponse> {
    return this.requestJson<SimulateResponse>(
      "POST",
      "/api/v1/simulate/transaction",
      transactionRequestBody(input),
    );
  }

  async normalizeTransaction(input: SdkTransactionInput): Promise<NormalizeResponse> {
    return this.requestJson<NormalizeResponse>(
      "POST",
      "/api/v1/transactions/normalize",
      transactionRequestBody(input),
    );
  }

  async evaluateRules(input: SdkTransactionInput): Promise<EvaluateRulesResponse> {
    return this.requestJson<EvaluateRulesResponse>(
      "POST",
      "/api/v1/transactions/evaluate-rules",
      transactionRequestBody(input),
    );
  }

  async scoreTransaction(input: SdkTransactionInput): Promise<ScoreResponse> {
    return this.requestJson<ScoreResponse>(
      "POST",
      "/api/v1/transactions/score",
      transactionRequestBody(input),
    );
  }

  async compareTransaction(input: SdkTransactionInput): Promise<CompareResponse> {
    return this.requestJson<CompareResponse>(
      "POST",
      "/api/v1/transactions/compare",
      transactionRequestBody(input),
    );
  }

  private async requestJson<T>(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...this.headers,
    };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    init.signal = controller.signal;

    let response: Response;
    try {
      response = await this.fetchImpl(url, init);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new SolanaGuardNetworkError(
          `SolanaGuard request timed out after ${this.timeoutMs}ms: ${method} ${path}`,
          error,
        );
      }
      throw new SolanaGuardNetworkError(
        `SolanaGuard request failed: ${method} ${path}`,
        error,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const errorBody = await readErrorBody(response);
      const message =
        (typeof errorBody?.message === "string" && errorBody.message) ||
        (typeof errorBody?.error === "string" && errorBody.error) ||
        `SolanaGuard API returned HTTP ${response.status} for ${method} ${path}`;
      if (response.status === 404) {
        throw new SolanaGuardNotFoundError(message, response.status, errorBody, path);
      }
      throw new SolanaGuardApiError(message, response.status, errorBody, path);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new SolanaGuardNetworkError(
        `SolanaGuard returned non-JSON for ${method} ${path}`,
        error,
      );
    }
  }
}

export function createSolanaGuardClient(options: SolanaGuardClientOptions): SolanaGuardClient {
  return new SolanaGuardClient(options);
}

/**
 * Convenience helper: analyze a transaction against a running SolanaGuard API.
 * Prefer `createSolanaGuardClient` when calling multiple endpoints.
 */
export async function analyzeTransaction(
  input: SdkTransactionInput,
  options: SolanaGuardClientOptions,
): Promise<TransactionAnalysisReport> {
  return createSolanaGuardClient(options).analyzeTransaction(input);
}
