import { config as loadDotenv } from "dotenv";
import type { SolanaNetwork } from "@solanaguard/types";

export interface SolanaGuardConfig {
  solanaRpcUrl: string;
  solanaNetwork: SolanaNetwork;
  apiHost: string;
  apiPort: number;
  /**
   * Unused until persistence is required. Empty string means "no database configured".
   */
  databaseUrl: string;
  /** Per-RPC HTTP timeout in milliseconds. */
  rpcTimeoutMs: number;
  /** Maximum JSON body size accepted by the API. */
  apiBodyLimitBytes: number;
  /** Soft request timeout for inbound HTTP (0 disables). */
  apiRequestTimeoutMs: number;
  /** Max requests per client per rate-limit window. */
  rateLimitMax: number;
  /** Rate-limit window in milliseconds. */
  rateLimitTimeWindowMs: number;
}

const NETWORKS: readonly SolanaNetwork[] = ["devnet", "testnet", "mainnet-beta", "localnet"];

export const DEFAULT_RPC_TIMEOUT_MS = 20_000;
export const DEFAULT_API_BODY_LIMIT_BYTES = 16_384;
export const DEFAULT_API_REQUEST_TIMEOUT_MS = 60_000;
export const DEFAULT_RATE_LIMIT_MAX = 60;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;

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

function parsePositiveInt(name: string, value: string, options?: { allowZero?: boolean }): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${name} must be an integer. Received: ${JSON.stringify(value)}`);
  }
  if (options?.allowZero) {
    if (parsed < 0) {
      throw new Error(`${name} must be >= 0. Received: ${JSON.stringify(value)}`);
    }
  } else if (parsed < 1) {
    throw new Error(`${name} must be >= 1. Received: ${JSON.stringify(value)}`);
  }
  return parsed;
}

export function parseConfig(env: NodeJS.ProcessEnv = process.env): SolanaGuardConfig {
  return {
    solanaRpcUrl: read(env, "SOLANA_RPC_URL", "https://api.devnet.solana.com"),
    solanaNetwork: parseNetwork(read(env, "SOLANA_NETWORK", "devnet")),
    apiHost: read(env, "API_HOST", "127.0.0.1"),
    apiPort: parsePort(read(env, "API_PORT", "3001")),
    databaseUrl: read(env, "DATABASE_URL", ""),
    rpcTimeoutMs: parsePositiveInt(
      "RPC_TIMEOUT_MS",
      read(env, "RPC_TIMEOUT_MS", String(DEFAULT_RPC_TIMEOUT_MS)),
    ),
    apiBodyLimitBytes: parsePositiveInt(
      "API_BODY_LIMIT_BYTES",
      read(env, "API_BODY_LIMIT_BYTES", String(DEFAULT_API_BODY_LIMIT_BYTES)),
    ),
    apiRequestTimeoutMs: parsePositiveInt(
      "API_REQUEST_TIMEOUT_MS",
      read(env, "API_REQUEST_TIMEOUT_MS", String(DEFAULT_API_REQUEST_TIMEOUT_MS)),
      { allowZero: true },
    ),
    rateLimitMax: parsePositiveInt(
      "RATE_LIMIT_MAX",
      read(env, "RATE_LIMIT_MAX", String(DEFAULT_RATE_LIMIT_MAX)),
    ),
    rateLimitTimeWindowMs: parsePositiveInt(
      "RATE_LIMIT_WINDOW_MS",
      read(env, "RATE_LIMIT_WINDOW_MS", String(DEFAULT_RATE_LIMIT_WINDOW_MS)),
    ),
  };
}

export function loadConfig(): SolanaGuardConfig {
  loadDotenv();
  return parseConfig(process.env);
}
