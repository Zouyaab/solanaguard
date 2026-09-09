import { describe, expect, it, vi } from "vitest";
import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from "fastify";
import { TransactionNotFoundError } from "@solanaguard/analyzer";
import { InvalidAddressError, RpcRequestError } from "@solanaguard/solana";
import { sendRpcError } from "./rpc-errors.js";

function mockReply() {
  const state: {
    statusCode?: number;
    body?: unknown;
  } = {};
  const log: FastifyBaseLogger = {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
    level: "info",
    silent: vi.fn(),
  } as unknown as FastifyBaseLogger;

  const request = {
    id: "req-test-1",
    url: "/api/v1/test",
    method: "GET",
    log,
    routeOptions: { url: "/api/v1/test" },
  } as unknown as FastifyRequest;

  const reply = {
    request,
    code(statusCode: number) {
      state.statusCode = statusCode;
      return this;
    },
    send(body: unknown) {
      state.body = body;
      return this;
    },
  } as unknown as FastifyReply;

  return { reply, state, log };
}

describe("sendRpcError", () => {
  it("maps TransactionNotFoundError to 404", () => {
    const { reply, state } = mockReply();
    sendRpcError(
      reply,
      new TransactionNotFoundError("Sig1111111111111111111111111111111111111111111"),
    );

    expect(state.statusCode).toBe(404);
    expect(state.body).toMatchObject({
      found: false,
      signature: "Sig1111111111111111111111111111111111111111111",
    });
    expect(JSON.stringify(state.body)).not.toMatch(/stack|at Object/i);
  });

  it("maps InvalidAddressError to 400", () => {
    const { reply, state } = mockReply();
    sendRpcError(reply, new InvalidAddressError("not-a-key"));

    expect(state.statusCode).toBe(400);
    expect(state.body).toEqual({
      error: "invalid_request",
      message: 'Not a valid Solana public key: "not-a-key"',
    });
  });

  it("maps RpcRequestError to 502", () => {
    const { reply, state } = mockReply();
    sendRpcError(reply, new RpcRequestError("getAccount", new Error("upstream timeout")));

    expect(state.statusCode).toBe(502);
    expect(state.body).toEqual({
      error: "rpc_failed",
      message: "Solana RPC getAccount failed: upstream timeout",
    });
  });

  it("maps unexpected errors to 500 with generic message and no stack/secret leak", () => {
    const { reply, state, log } = mockReply();
    const secret = "privateKey=super-secret-value";
    const boom = new Error(`Unexpected failure ${secret}`);
    boom.stack = `Error: Unexpected failure ${secret}\n    at Object.<anonymous> (/secret/path.ts:1:1)`;

    sendRpcError(reply, boom);

    expect(state.statusCode).toBe(500);
    expect(state.body).toEqual({
      error: "internal",
      message: "Internal server error",
    });
    const serialized = JSON.stringify({
      body: state.body,
      logCalls: (log.error as ReturnType<typeof vi.fn>).mock.calls,
    });
    expect(serialized).not.toContain("super-secret-value");
    expect(serialized).not.toContain("/secret/path.ts");
    expect(serialized).not.toMatch(/stack/i);
    expect(log.error).toHaveBeenCalled();
  });
});
