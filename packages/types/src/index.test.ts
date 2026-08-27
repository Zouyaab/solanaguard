import { describe, expect, it } from "vitest";
import { SOLANAGUARD_NAME, SOLANAGUARD_VERSION, MAX_SOLANA_TRANSACTION_BYTES } from "./index.js";

describe("@solanaguard/types", () => {
  it("exports a semver version string", () => {
    expect(SOLANAGUARD_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("exports the product name", () => {
    expect(SOLANAGUARD_NAME).toBe("SolanaGuard");
  });

  it("exports the Solana packet size limit used by Phase 3", () => {
    expect(MAX_SOLANA_TRANSACTION_BYTES).toBe(1232);
  });
});
