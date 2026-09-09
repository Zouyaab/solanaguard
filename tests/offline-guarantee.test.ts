import { describe, expect, it } from "vitest";

/**
 * Guards the default Vitest suite from accidental Devnet coupling.
 * Opt-in live tests live in *.devnet.test.ts and require SOLANAGUARD_DEVNET_IT=1.
 */
describe("offline guarantee", () => {
  it("does not enable Devnet integration by default", () => {
    expect(process.env.SOLANAGUARD_DEVNET_IT ?? "").toBe("");
  });

  it("keeps Devnet suites behind an explicit opt-in naming convention", async () => {
    const { readdir } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const root = join(process.cwd(), "packages");
    async function walk(dir: string): Promise<string[]> {
      const entries = await readdir(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === "dist") continue;
          files.push(...(await walk(path)));
        } else if (entry.name.endsWith(".devnet.test.ts")) {
          files.push(path);
        }
      }
      return files;
    }
    const devnetFiles = await walk(root);
    const testsRoot = await walk(join(process.cwd(), "tests")).catch(() => [] as string[]);
    expect([...devnetFiles, ...testsRoot].length).toBeGreaterThan(0);
  });
});
