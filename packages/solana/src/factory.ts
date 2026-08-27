import type { SolanaGuardConfig } from "@solanaguard/config";
import { SolanaRpc } from "./client.js";
import { createConnection, createWeb3JsAdapter } from "./web3js-adapter.js";

export function createSolanaRpc(config: Pick<SolanaGuardConfig, "solanaRpcUrl">): SolanaRpc {
  const connection = createConnection(config.solanaRpcUrl);
  return new SolanaRpc(createWeb3JsAdapter(connection), config.solanaRpcUrl);
}

export function createSolanaRpcFromUrl(rpcUrl: string): SolanaRpc {
  return createSolanaRpc({ solanaRpcUrl: rpcUrl });
}
