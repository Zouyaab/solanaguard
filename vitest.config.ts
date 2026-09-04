import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "apps/web/**", "examples/wallet-demo/dist/**"],
    environment: "node",
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@solanaguard/types": fileURLToPath(
        new URL("./packages/types/src/index.ts", import.meta.url),
      ),
      "@solanaguard/config": fileURLToPath(
        new URL("./packages/config/src/index.ts", import.meta.url),
      ),
      "@solanaguard/solana": fileURLToPath(
        new URL("./packages/solana/src/index.ts", import.meta.url),
      ),
      "@solanaguard/analyzer": fileURLToPath(
        new URL("./packages/analyzer/src/index.ts", import.meta.url),
      ),
      "@solanaguard/risk-engine": fileURLToPath(
        new URL("./packages/risk-engine/src/index.ts", import.meta.url),
      ),
      "@solanaguard/sdk": fileURLToPath(
        new URL("./packages/sdk/src/index.ts", import.meta.url),
      ),
    },
  },
});
