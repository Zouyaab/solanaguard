import type { SolanaRpc } from "@solanaguard/solana";
import type { MetricsRegistry } from "../metrics.js";

export interface ApiRouteContext {
  rpc?: SolanaRpc;
  metrics: MetricsRegistry;
}
