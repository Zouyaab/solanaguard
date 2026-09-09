import type { FastifyInstance } from "fastify";
import { jsonAccount } from "../account-json.js";
import { sendRpcError } from "../rpc-errors.js";
import {
  addressParamSchema,
  errorResponseSchema,
  programIdParamSchema,
  signatureParamSchema,
} from "../schemas.js";
import {
  validateAddressParam,
  validateProgramIdParam,
  validateSignatureParam,
} from "../validation.js";
import type { ApiRouteContext } from "./types.js";

export function registerRpcRoutes(app: FastifyInstance, ctx: ApiRouteContext): void {
  const { rpc } = ctx;

  app.get(
    "/api/v1/rpc/status",
    {
      schema: {
        tags: ["rpc"],
        summary: "Configured Solana RPC reachability",
        response: {
          200: {
            type: "object",
            additionalProperties: true,
          },
          502: {
            type: "object",
            additionalProperties: true,
          },
          503: errorResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      if (!rpc) {
        return reply.code(503).send({
          error: "rpc_not_configured",
          message: "This process was started without a Solana RPC client.",
        });
      }
      const status = await rpc.getStatus();
      if (!status.reachable) {
        return reply.code(502).send(status);
      }
      return reply.code(200).send(status);
    },
  );

  app.get<{ Params: { address: string } }>(
    "/api/v1/account/:address",
    {
      schema: {
        tags: ["rpc"],
        summary: "Fetch a Solana account",
        description: "Returns account data when present. Missing accounts are not risk findings.",
        params: addressParamSchema,
        response: {
          400: errorResponseSchema,
          404: errorResponseSchema,
          503: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const invalid = validateAddressParam(request.params.address);
      if (invalid) {
        return reply.code(400).send({ error: "invalid_request", message: invalid });
      }
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
    },
  );

  app.get<{ Params: { programId: string } }>(
    "/api/v1/program/:programId",
    {
      schema: {
        tags: ["rpc"],
        summary: "Fetch a program account",
        description:
          "Looks up the program id as an account. executable=false means the address is not an on-chain program on this cluster — not evidence of malice.",
        params: programIdParamSchema,
        response: {
          400: errorResponseSchema,
          404: errorResponseSchema,
          503: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const invalid = validateProgramIdParam(request.params.programId);
      if (invalid) {
        return reply.code(400).send({ error: "invalid_request", message: invalid });
      }
      if (!rpc) {
        return reply.code(503).send({
          error: "rpc_not_configured",
          message: "This process was started without a Solana RPC client.",
        });
      }
      try {
        const account = await rpc.getAccount(request.params.programId);
        if (!account) {
          return reply.code(404).send({
            found: false,
            programId: request.params.programId,
            message: "No account exists at this program id on the configured cluster.",
          });
        }
        return {
          found: true,
          programId: request.params.programId,
          executable: account.executable,
          account: jsonAccount(account),
          note: account.executable
            ? "Account is marked executable on this cluster. That is not a safety verdict."
            : "Account exists but is not marked executable on this cluster. That is incomplete program coverage, not evidence of malice.",
        };
      } catch (error) {
        return sendRpcError(reply, error);
      }
    },
  );

  app.get<{ Params: { signature: string } }>(
    "/api/v1/transaction/:signature",
    {
      schema: {
        tags: ["rpc"],
        summary: "Fetch a confirmed transaction",
        params: signatureParamSchema,
        response: {
          400: errorResponseSchema,
          404: errorResponseSchema,
          503: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const invalid = validateSignatureParam(request.params.signature);
      if (invalid) {
        return reply.code(400).send({ error: "invalid_request", message: invalid });
      }
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
}
