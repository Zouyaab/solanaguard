import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import {
  classifyAddress,
  normalizeTransaction,
  TransactionNotFoundError,
} from "@solanaguard/analyzer";
import { SOLANAGUARD_NAME, SOLANAGUARD_VERSION, type HealthStatus } from "@solanaguard/types";
import {
  InvalidAddressError,
  InvalidTransactionError,
  RpcRequestError,
  type NormalizedAccount,
  type SolanaRpc,
} from "@solanaguard/solana";

export interface AppOptions {
  logger?: boolean;
  rpc?: SolanaRpc;
}

function jsonAccount(account: NormalizedAccount) {
  const curve = classifyAddress(account.address);
  return {
    address: account.address,
    lamports: account.lamports.toString(),
    owner: account.owner,
    executable: account.executable,
    rentEpoch: account.rentEpoch?.toString() ?? null,
    dataLength: account.dataLength,
    dataBase64: account.dataBase64,
    onCurve: curve.onCurve,
    curveClass: curve.curveClass,
  };
}

function sendRpcError(reply: FastifyReply, error: unknown) {
  if (error instanceof TransactionNotFoundError) {
    return reply.code(404).send({
      found: false,
      signature: error.signature,
      message: error.message,
    });
  }
  if (error instanceof InvalidAddressError || error instanceof InvalidTransactionError) {
    return reply.code(400).send({ error: "invalid_request", message: error.message });
  }
  if (error instanceof RpcRequestError) {
    return reply.code(502).send({ error: "rpc_failed", message: error.message });
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  return reply.code(500).send({ error: "internal", message });
}

export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false });
  const rpc = options.rpc;

  app.get("/api/v1/health", async (): Promise<HealthStatus> => {
    return {
      status: "ok",
      service: SOLANAGUARD_NAME,
      version: SOLANAGUARD_VERSION,
      time: new Date().toISOString(),
    };
  });

  app.get("/api/v1/version", async () => {
    return {
      name: SOLANAGUARD_NAME,
      version: SOLANAGUARD_VERSION,
      phase: 6,
      note: "Phase 6 classifies Ed25519 on-curve vs off-curve account keys. Off-curve is common for program-derived addresses and is not evidence of malice. Seeds are not recovered. Risk analysis is not implemented yet.",
    };
  });

  app.get("/api/v1/rpc/status", async (_request, reply) => {
    if (!rpc) {
      return reply.code(503).send({
        error: "rpc_not_configured",
        message: "This process was started without a Solana RPC client.",
      });
    }
    const status = await rpc.getStatus();
    return reply.code(status.reachable ? 200 : 502).send(status);
  });

  app.get<{ Params: { address: string } }>("/api/v1/account/:address", async (request, reply) => {
    if (!rpc) {
      return reply.code(503).send({
        error: "rpc_not_configured",
        message: "This process was started without a Solana RPC client.",
      });
    }
    try {
      const account = await rpc.getAccount(request.params.address);
      if (!account) {
        return reply.code(404).send({
          found: false,
          address: request.params.address,
          message: "No account exists at this address on the configured cluster.",
        });
      }
      return { found: true, account: jsonAccount(account) };
    } catch (error) {
      return sendRpcError(reply, error);
    }
  });

  app.get<{ Params: { signature: string } }>(
    "/api/v1/transaction/:signature",
    async (request, reply) => {
      if (!rpc) {
        return reply.code(503).send({
          error: "rpc_not_configured",
          message: "This process was started without a Solana RPC client.",
        });
      }
      try {
        const transaction = await rpc.getTransaction(request.params.signature);
        if (!transaction) {
          return reply.code(404).send({
            found: false,
            signature: request.params.signature,
            message: "No confirmed transaction with this signature on the configured cluster.",
          });
        }
        return { found: true, transaction };
      } catch (error) {
        return sendRpcError(reply, error);
      }
    },
  );

  app.post("/api/v1/transactions/normalize", async (request, reply) => {
    const body = request.body;
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return reply.code(400).send({
        error: "invalid_request",
        message: "JSON body must be an object with base64 or signature.",
      });
    }
    const record = body as Record<string, unknown>;
    const base64 = record.base64;
    const signature = record.signature;
    if (typeof base64 === "string" && typeof signature === "string") {
      return reply.code(400).send({
        error: "invalid_request",
        message: "Provide either base64 or signature, not both.",
      });
    }
    try {
      if (typeof base64 === "string") {
        const transaction = await normalizeTransaction(
          { source: "base64", base64 },
          rpc ? { rpc } : undefined,
        );
        return { transaction };
      }
      if (typeof signature === "string") {
        if (!rpc) {
          return reply.code(503).send({
            error: "rpc_not_configured",
            message: "This process was started without a Solana RPC client.",
          });
        }
        const transaction = await normalizeTransaction({ source: "signature", signature }, { rpc });
        return { transaction };
      }
      return reply.code(400).send({
        error: "invalid_request",
        message: "JSON body must include string field base64 or signature.",
      });
    } catch (error) {
      return sendRpcError(reply, error);
    }
  });

  return app;
}
