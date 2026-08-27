export class TransactionNotFoundError extends Error {
  override readonly name = "TransactionNotFoundError";
  readonly signature: string;

  constructor(signature: string) {
    super(`No confirmed transaction with this signature on the configured cluster: ${signature}`);
    this.signature = signature;
  }
}
