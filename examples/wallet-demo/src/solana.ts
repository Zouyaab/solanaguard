import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  type TransactionSignature,
} from "@solana/web3.js";

/** Tiny self-transfer used only as a Devnet demo payload. */
export const DEMO_TRANSFER_LAMPORTS = 1_000;

export function getDemoRpcUrl(): string {
  return import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
}

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_SOLANAGUARD_API_URL ?? "http://127.0.0.1:3001";
}

export function assertDevnetEndpoint(endpoint: string): void {
  const lower = endpoint.toLowerCase();
  if (lower.includes("mainnet")) {
    throw new Error(
      "This demo refuses mainnet endpoints. Use Devnet only (development/test environment).",
    );
  }
}

/**
 * Build an unsigned legacy transfer of DEMO_TRANSFER_LAMPORTS lamports to self.
 * Callers must never sign this without an explicit review step.
 */
export async function buildDemoTransferTransaction(
  connection: Connection,
  payer: PublicKey,
): Promise<{ transaction: Transaction; base64: string }> {
  assertDevnetEndpoint(connection.rpcEndpoint);
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: payer,
      lamports: DEMO_TRANSFER_LAMPORTS,
    }),
  );
  transaction.feePayer = payer;
  transaction.recentBlockhash = blockhash;
  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  const base64 = uint8ToBase64(serialized);
  return { transaction, base64 };
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export async function sendSignedTransaction(
  connection: Connection,
  signed: Transaction,
): Promise<TransactionSignature> {
  assertDevnetEndpoint(connection.rpcEndpoint);
  const raw = signed.serialize();
  return connection.sendRawTransaction(raw, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
}
