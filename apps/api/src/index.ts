import { loadConfig } from "@solanaguard/config";
import { createSolanaRpc } from "@solanaguard/solana";
import { buildApp } from "./app.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const rpc = createSolanaRpc(config);
  const app = buildApp({ logger: true, rpc });

  try {
    const address = await app.listen({ host: config.apiHost, port: config.apiPort });
    app.log.info(`SolanaGuard API listening at ${address}`);
    app.log.info(`Solana RPC ${rpc.endpointLabel()}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
