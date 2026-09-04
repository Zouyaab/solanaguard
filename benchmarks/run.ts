/**
 * Measured offline micro-benchmarks.
 * Prints real timings from this process — does not invent numbers.
 *
 * Usage: pnpm bench
 */
import process from "node:process";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { analyzeTransaction, normalizeLocalTransaction } from "@solanaguard/analyzer";
import { buildApp } from "../apps/api/src/app.js";
import {
  buildSignedMemo,
  buildSignedTransfer,
  buildSignedUnknownProgram,
} from "../tests/fixtures/transactions.js";
import { createFixtureRpc } from "../tests/fixtures/mock-rpc.js";
import { formatMs, summarize, type SampleStats } from "./stats.js";

const WARMUP = Number(process.env.SOLANAGUARD_BENCH_WARMUP ?? 5);
const ITERATIONS = Number(process.env.SOLANAGUARD_BENCH_ITERATIONS ?? 40);

async function measure(name: string, fn: () => Promise<void> | void): Promise<SampleStats> {
  for (let i = 0; i < WARMUP; i += 1) {
    await fn();
  }
  const samples: number[] = [];
  for (let i = 0; i < ITERATIONS; i += 1) {
    const start = performance.now();
    await fn();
    samples.push(performance.now() - start);
  }
  return summarize(name, samples);
}

function printTable(rows: SampleStats[]): void {
  const headers = ["workload", "n", "min_ms", "mean_ms", "p50_ms", "p95_ms", "max_ms"];
  const lines = [
    headers.join("\t"),
    ...rows.map((row) =>
      [
        row.name,
        String(row.iterations),
        formatMs(row.minMs),
        formatMs(row.meanMs),
        formatMs(row.p50Ms),
        formatMs(row.p95Ms),
        formatMs(row.maxMs),
      ].join("\t"),
    ),
  ];
  console.log(lines.join("\n"));
}

async function main(): Promise<void> {
  const transfer = buildSignedTransfer();
  const memo = buildSignedMemo();
  const unknown = buildSignedUnknownProgram();
  const rpc = createFixtureRpc();

  const app = await buildApp({
    rpc,
    hardening: { enableRateLimit: false },
    logger: false,
  });
  await app.ready();

  console.log("SolanaGuard offline micro-benchmarks (measured)");
  console.log(
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        osRelease: os.release(),
        cpu: os.cpus()[0]?.model ?? "unknown",
        cpuCount: os.cpus().length,
        warmup: WARMUP,
        iterations: ITERATIONS,
        note: "Machine-local timings only. Not an SLA. Not a safety metric.",
      },
      null,
      2,
    ),
  );
  console.log("");

  const rows: SampleStats[] = [];
  rows.push(
    await measure("normalizeLocalTransaction/signed_transfer", () => {
      normalizeLocalTransaction({ source: "base64", base64: transfer.base64 });
    }),
  );
  rows.push(
    await measure("analyzeTransaction/signed_transfer_no_rpc", async () => {
      await analyzeTransaction({ source: "base64", base64: transfer.base64 });
    }),
  );
  rows.push(
    await measure("analyzeTransaction/signed_memo_no_rpc", async () => {
      await analyzeTransaction({ source: "base64", base64: memo.base64 });
    }),
  );
  rows.push(
    await measure("analyzeTransaction/unknown_program_no_rpc", async () => {
      await analyzeTransaction({ source: "base64", base64: unknown.base64 });
    }),
  );
  rows.push(
    await measure("analyzeTransaction/transfer_stub_rpc_simulate", async () => {
      await analyzeTransaction({ source: "base64", base64: transfer.base64 }, { rpc });
    }),
  );
  rows.push(
    await measure("analyzeTransaction/transfer_stub_rpc_no_sim", async () => {
      await analyzeTransaction(
        { source: "base64", base64: transfer.base64 },
        { rpc, includeSimulation: false },
      );
    }),
  );
  rows.push(
    await measure("api.inject/GET_health", async () => {
      const response = await app.inject({ method: "GET", url: "/api/v1/health" });
      if (response.statusCode !== 200) {
        throw new Error(`health status ${response.statusCode}`);
      }
    }),
  );
  rows.push(
    await measure("api.inject/POST_normalize", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/transactions/normalize",
        payload: { base64: transfer.base64 },
      });
      if (response.statusCode !== 200) {
        throw new Error(`normalize status ${response.statusCode}`);
      }
    }),
  );
  rows.push(
    await measure("api.inject/POST_analyze", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/analyze/transaction",
        payload: { base64: transfer.base64 },
      });
      if (response.statusCode !== 200) {
        throw new Error(`analyze status ${response.statusCode}: ${response.body}`);
      }
    }),
  );

  printTable(rows);
  await app.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
