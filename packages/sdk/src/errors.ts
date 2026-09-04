/**
 * HTTP client errors for @solanaguard/sdk.
 * Status codes and bodies come from the SolanaGuard API; they are not risk findings.
 */

export interface SolanaGuardErrorBody {
  error?: string;
  message?: string;
  found?: boolean;
  [key: string]: unknown;
}

export class SolanaGuardError extends Error {
  override name = "SolanaGuardError";
}

export class SolanaGuardNetworkError extends SolanaGuardError {
  override name = "SolanaGuardNetworkError";

  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
  }
}

export class SolanaGuardApiError extends SolanaGuardError {
  override name = "SolanaGuardApiError";

  constructor(
    message: string,
    readonly status: number,
    readonly body: SolanaGuardErrorBody | null,
    readonly path: string,
  ) {
    super(message);
  }
}

export class SolanaGuardNotFoundError extends SolanaGuardApiError {
  override name = "SolanaGuardNotFoundError";
}

export class SolanaGuardRequestError extends SolanaGuardError {
  override name = "SolanaGuardRequestError";
}
