import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
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
    },
  },
});
