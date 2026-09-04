/**
 * Fastify JSON Schema fragments for Phase 11 request validation and OpenAPI.
 * Response bodies stay loosely typed so NormalizedTransaction evolution does not
 * require regenerating a giant OpenAPI tree every phase.
 */

export const errorResponseSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    error: { type: "string" },
    message: { type: "string" },
  },
} as const;

export const transactionInputBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    base64: {
      type: "string",
      description: "Wire-format Solana transaction, base64-encoded.",
      maxLength: 2048,
    },
    signature: {
      type: "string",
      description: "Confirmed transaction signature to fetch from the configured RPC.",
      minLength: 64,
      maxLength: 128,
    },
    includeSimulation: {
      type: "boolean",
      description:
        "Analyze only: when false, skip RPC simulation/comparison even if RPC is configured. Default true.",
    },
  },
  anyOf: [{ required: ["base64"] }, { required: ["signature"] }],
} as const;

export const addressParamSchema = {
  type: "object",
  required: ["address"],
  additionalProperties: false,
  properties: {
    address: {
      type: "string",
      description: "Base58 Solana address.",
      minLength: 32,
      maxLength: 64,
    },
  },
} as const;

export const signatureParamSchema = {
  type: "object",
  required: ["signature"],
  additionalProperties: false,
  properties: {
    signature: {
      type: "string",
      description: "Base58 transaction signature.",
      minLength: 64,
      maxLength: 128,
    },
  },
} as const;

export const programIdParamSchema = {
  type: "object",
  required: ["programId"],
  additionalProperties: false,
  properties: {
    programId: {
      type: "string",
      description: "Base58 program account address.",
      minLength: 32,
      maxLength: 64,
    },
  },
} as const;
