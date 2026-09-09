import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

describe("OpenAPI contract", () => {
  it("documents every registered HTTP route and error shapes for analyze", async () => {
    const app = await buildApp({ hardening: { enableRateLimit: false } });
    const response = await app.inject({ method: "GET", url: "/api/v1/openapi.json" });
    expect(response.statusCode).toBe(200);
    const doc = response.json() as {
      openapi: string;
      paths: Record<string, Record<string, { responses?: Record<string, unknown> }>>;
    };
    expect(doc.openapi).toMatch(/^3\./);

    const requiredPaths = [
      "/api/v1/health",
      "/api/v1/version",
      "/api/v1/metrics",
      "/api/v1/rpc/status",
      "/api/v1/account/{address}",
      "/api/v1/program/{programId}",
      "/api/v1/transaction/{signature}",
      "/api/v1/transactions/normalize",
      "/api/v1/transactions/evaluate-rules",
      "/api/v1/transactions/score",
      "/api/v1/transactions/simulate",
      "/api/v1/transactions/compare",
      "/api/v1/analyze/transaction",
      "/api/v1/simulate/transaction",
    ];
    for (const path of requiredPaths) {
      expect(doc.paths[path], `missing OpenAPI path ${path}`).toBeDefined();
    }

    const analyze = doc.paths["/api/v1/analyze/transaction"]?.post;
    expect(analyze?.responses?.["400"]).toBeDefined();
    expect(analyze?.responses?.["503"]).toBeDefined();

    const metrics = doc.paths["/api/v1/metrics"]?.get;
    expect(metrics?.responses?.["200"]).toBeDefined();
    await app.close();
  });
});
