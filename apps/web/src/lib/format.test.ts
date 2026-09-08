import { describe, expect, it } from "vitest";
import { bandLabel, severityTone, shorten } from "./format";

describe("format helpers", () => {
  it("labels score bands for display", () => {
    expect(bandLabel("no_findings")).toBe("No findings");
    expect(bandLabel("informational")).toBe("Informational");
    expect(bandLabel("elevated")).toBe("Elevated");
    expect(bandLabel("requires_review")).toBe("Requires review");
  });

  it("maps severities to tone classes", () => {
    expect(severityTone("info")).toContain("border-mist");
    expect(severityTone("unusual")).toContain("ember");
    expect(severityTone("needs_review")).toContain("ember");
  });

  it("shortens long addresses", () => {
    expect(shorten("abcdefghijklmnop", 4, 4)).toBe("abcd…mnop");
    expect(shorten("short")).toBe("short");
  });
});
