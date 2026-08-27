export class InvalidAddressError extends Error {
  override readonly name = "InvalidAddressError";
  constructor(value: string, cause?: unknown) {
    super(`Not a valid Solana public key: ${JSON.stringify(value)}`, { cause });
  }
}

export class InvalidTransactionError extends Error {
  override readonly name = "InvalidTransactionError";
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
  }
}

export class RpcRequestError extends Error {
  override readonly name = "RpcRequestError";
  constructor(operation: string, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`Solana RPC ${operation} failed: ${detail}`, { cause });
  }
}
