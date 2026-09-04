/**
 * Runs the Vitest suite with live Devnet cases enabled.
 * Usage: pnpm test:devnet
 */
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync("pnpm", ["exec", "vitest", "run"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, SOLANAGUARD_DEVNET_IT: "1" },
  shell: true,
});

process.exit(result.status ?? 1);
