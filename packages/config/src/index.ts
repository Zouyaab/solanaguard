import { config as loadDotenv } from "dotenv";
import type { SolanaNetwork } from "@solanaguard/types";

export interface SolanaGuardConfig {
  solanaRpcUrl: string;
  solanaNetwork: SolanaNetwork;
  apiHost: string;
  apiPort: number;
  /**
   * Unused in Phase 1. Empty string means "no database configured".
   * Persistence will be added only when a feature actually needs it.
   */
  databaseUrl: string;
}

const NETWORKS: readonly SolanaNetwork[] = ["devnet", "testnet", "mainnet-beta", "localnet"];

function read(env: NodeJS.ProcessEnv, name: string, fallback: string): string {
  const value = env[name];
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  return value.trim();
}

function parseNetwork(value: string): SolanaNetwork {
  if ((NETWORKS as readonly string[]).includes(value)) {
    return value as SolanaNetwork;
  }
  throw new Error(
    `SOLANA_NETWORK must be one of ${NETWORKS.join(", ")}. Received: ${JSON.stringify(value)}`,
  );
}

function parsePort(value: string): number {
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`API_PORT must be an integer 1–65535. Received: ${JSON.stringify(value)}`);
  }
  return port;
}

export function parseConfig(env: NodeJS.ProcessEnv = process.env): SolanaGuardConfig {
  return {
    solanaRpcUrl: read(env, "SOLANA_RPC_URL", "https://api.devnet.solana.com"),
    solanaNetwork: parseNetwork(read(env, "SOLANA_NETWORK", "devnet")),
    apiHost: read(env, "API_HOST", "127.0.0.1"),
    apiPort: parsePort(read(env, "API_PORT", "3001")),
    databaseUrl: read(env, "DATABASE_URL", ""),
  };
}

export function loadConfig(): SolanaGuardConfig {
  loadDotenv();
  return parseConfig(process.env);
}
