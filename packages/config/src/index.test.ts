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
  });

  it("rejects an invalid network", () => {
    expect(() => parseConfig({ SOLANA_NETWORK: "ethereum" })).toThrow(/SOLANA_NETWORK/);
  });

  it("rejects a non-numeric port", () => {
    expect(() => parseConfig({ API_PORT: "abc" })).toThrow(/API_PORT/);
  });
});
