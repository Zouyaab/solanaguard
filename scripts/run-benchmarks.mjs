/**
 * Runs measured benchmarks via vite-node (same path aliases as Vitest).
 */
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(
  "pnpm",
  ["exec", "vite-node", "--config", "vitest.config.ts", "benchmarks/run.ts"],
  {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: true,
  },
);

process.exit(result.status ?? 1);
