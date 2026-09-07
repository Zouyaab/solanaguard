import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "apps/web/**", "examples/wallet-demo/dist/**"],
    environment: "node",
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "packages/*/src/**/*.ts",
        "apps/api/src/**/*.ts",
        "cli/src/**/*.ts",
        "benchmarks/**/*.ts",
        "examples/wallet-demo/src/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.devnet.test.ts",
        "**/dist/**",
        "**/node_modules/**",
        "**/.next/**",
        "apps/web/**",
        // Barrel re-exports and process entrypoints (no meaningful logic).
        "packages/*/src/index.ts",
        "apps/api/src/index.ts",
        "cli/src/index.ts",
        // Type-only modules (interfaces/types; no runtime branches to cover).
        "packages/types/src/analysis.ts",
        "packages/types/src/comparison.ts",
        "packages/types/src/rules.ts",
        "packages/types/src/simulation.ts",
        "packages/sdk/src/types.ts",
        // UI/entry/demo glue and one-shot bench runner.
        "examples/wallet-demo/src/main.tsx",
        "examples/wallet-demo/src/DemoApp.tsx",
        "examples/wallet-demo/src/WalletProviders.tsx",
        "examples/wallet-demo/src/vite-env.d.ts",
        "benchmarks/run.ts",
      ],
      thresholds: {
        lines: 70,
        statements: 70,
        functions: 70,
        branches: 70,
      },
    },
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
      "@solanaguard/sdk": fileURLToPath(new URL("./packages/sdk/src/index.ts", import.meta.url)),
    },
  },
});
