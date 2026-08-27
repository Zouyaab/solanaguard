import { describe, expect, it } from "vitest";
import { SOLANAGUARD_VERSION } from "@solanaguard/types";
import { runCli } from "./cli.js";

describe("CLI", () => {
  it("prints the version with --version", async () => {
    const result = await runCli(["--version"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(SOLANAGUARD_VERSION);
  });

  it("does not claim analysis exists yet", async () => {
    const result = await runCli([]);
    expect(result.stdout).toMatch(/not implemented yet/i);
  });

  it("requires flags for normalize", async () => {
    const result = await runCli(["normalize"]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toMatch(/Usage: solanaguard normalize/i);
  });
});
