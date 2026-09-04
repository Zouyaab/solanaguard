import type { SolanaGuardConfig } from "@solanaguard/config";
import { SolanaRpc } from "./client.js";
import { createConnection, createWeb3JsAdapter } from "./web3js-adapter.js";

export function createSolanaRpc(
  config: Pick<SolanaGuardConfig, "solanaRpcUrl"> & { rpcTimeoutMs?: number },
): SolanaRpc {
  const connection = createConnection(config.solanaRpcUrl, config.rpcTimeoutMs);
  return new SolanaRpc(createWeb3JsAdapter(connection), config.solanaRpcUrl);
}

export function createSolanaRpcFromUrl(rpcUrl: string, rpcTimeoutMs?: number): SolanaRpc {
  const options: Pick<SolanaGuardConfig, "solanaRpcUrl"> & { rpcTimeoutMs?: number } = {
    solanaRpcUrl: rpcUrl,
  };
  if (rpcTimeoutMs !== undefined) {
    options.rpcTimeoutMs = rpcTimeoutMs;
  }
  return createSolanaRpc(options);
}
