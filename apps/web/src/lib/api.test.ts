import { describe, expect, it, vi } from "vitest";
import { getApiBaseUrl } from "./api";

describe("getApiBaseUrl", () => {
  it("defaults to local API when env is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SOLANAGUARD_API_URL", undefined);
    expect(getApiBaseUrl()).toBe("http://127.0.0.1:3001");
    vi.unstubAllEnvs();
  });

  it("uses the configured public API URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SOLANAGUARD_API_URL", "http://example.test:4000");
    expect(getApiBaseUrl()).toBe("http://example.test:4000");
    vi.unstubAllEnvs();
  });
});
