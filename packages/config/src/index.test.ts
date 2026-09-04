import { describe, expect, it } from "vitest";
import { parseConfig } from "./index.js";

describe("parseConfig", () => {
  it("applies documented defaults", () => {
    const config = parseConfig({});
    expect(config.solanaRpcUrl).toBe("https://api.devnet.solana.com");
    expect(config.solanaNetwork).toBe("devnet");
    expect(config.apiHost).toBe("127.0.0.1");
    expect(config.apiPort).toBe(3001);
    expect(config.databaseUrl).toBe("");
    expect(config.rpcTimeoutMs).toBe(20_000);
    expect(config.apiBodyLimitBytes).toBe(16_384);
    expect(config.apiRequestTimeoutMs).toBe(60_000);
    expect(config.rateLimitMax).toBe(60);
    expect(config.rateLimitTimeWindowMs).toBe(60_000);
  });

  it("rejects an invalid network", () => {
    expect(() => parseConfig({ SOLANA_NETWORK: "ethereum" })).toThrow(/SOLANA_NETWORK/);
  });

  it("rejects a non-numeric port", () => {
    expect(() => parseConfig({ API_PORT: "abc" })).toThrow(/API_PORT/);
  });

  it("parses hardening env overrides", () => {
    const config = parseConfig({
      RPC_TIMEOUT_MS: "15000",
      API_BODY_LIMIT_BYTES: "8192",
      API_REQUEST_TIMEOUT_MS: "0",
      RATE_LIMIT_MAX: "10",
      RATE_LIMIT_WINDOW_MS: "30000",
    });
    expect(config.rpcTimeoutMs).toBe(15_000);
    expect(config.apiBodyLimitBytes).toBe(8192);
    expect(config.apiRequestTimeoutMs).toBe(0);
    expect(config.rateLimitMax).toBe(10);
    expect(config.rateLimitTimeWindowMs).toBe(30_000);
  });

  it("rejects non-positive rate limits", () => {
    expect(() => parseConfig({ RATE_LIMIT_MAX: "0" })).toThrow(/RATE_LIMIT_MAX/);
  });
});
