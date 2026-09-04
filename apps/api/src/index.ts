import { loadConfig } from "@solanaguard/config";
import { createSolanaRpc } from "@solanaguard/solana";
import { buildApp } from "./app.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const rpc = createSolanaRpc(config);
  const app = await buildApp({
    logger: true,
    rpc,
    hardening: {
      bodyLimitBytes: config.apiBodyLimitBytes,
      requestTimeoutMs: config.apiRequestTimeoutMs,
      rateLimitMax: config.rateLimitMax,
      rateLimitTimeWindowMs: config.rateLimitTimeWindowMs,
    },
  });

  try {
    const address = await app.listen({ host: config.apiHost, port: config.apiPort });
    app.log.info(`SolanaGuard API listening at ${address}`);
    app.log.info(`OpenAPI UI at ${address}/documentation`);
    app.log.info(`Solana RPC ${rpc.endpointLabel()}`);
    app.log.info(
      `Hardening: bodyLimit=${config.apiBodyLimitBytes}B rateLimit=${config.rateLimitMax}/${config.rateLimitTimeWindowMs}ms rpcTimeout=${config.rpcTimeoutMs}ms`,
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
