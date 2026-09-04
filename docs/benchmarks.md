# Benchmarks

Phase 18 provides a **measured** offline micro-benchmark harness. Latency numbers in this document come from a real `pnpm bench` run on a developer machine. They are not invented marketing claims, not SLAs, and not safety metrics.

## How to measure

```bash
pnpm bench
```

Optional knobs:

| Env | Default | Meaning |
| --- | --- | --- |
| `SOLANAGUARD_BENCH_WARMUP` | `5` | Discarded warm-up iterations |
| `SOLANAGUARD_BENCH_ITERATIONS` | `40` | Timed iterations per workload |

Harness: `benchmarks/run.ts` (via `scripts/run-benchmarks.mjs` + `vite-node`).

## What is timed

Offline fixtures only (no live Devnet RPC):

- `normalizeLocalTransaction` / `analyzeTransaction` for transfer, memo, unknown program
- Analyze with stub RPC (simulate on / off)
- Fastify `inject()` for health, normalize, and analyze

Live public RPC is excluded because network jitter would make numbers misleading.

## Sample measured run

Captured by running `pnpm bench` on the machine below. Re-run before quoting.

**Environment**

| Field | Value |
| --- | --- |
| measuredAt | `2026-09-04T12:52:49.171Z` |
| node | `v22.15.0` |
| platform | `win32` / `x64` |
| osRelease | `10.0.26200` |
| cpu | Intel(R) Core(TM) i5-10210U CPU @ 1.60GHz (8 logical) |
| warmup / iterations | 5 / 40 |

**Results (milliseconds)**

| workload | n | min | mean | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| normalizeLocalTransaction/signed_transfer | 40 | 1.362 | 2.163 | 1.779 | 3.799 | 6.644 |
| analyzeTransaction/signed_transfer_no_rpc | 40 | 1.264 | 2.302 | 1.936 | 4.599 | 7.403 |
| analyzeTransaction/signed_memo_no_rpc | 40 | 1.077 | 1.695 | 1.654 | 2.900 | 3.581 |
| analyzeTransaction/unknown_program_no_rpc | 40 | 1.115 | 2.035 | 1.846 | 3.475 | 4.393 |
| analyzeTransaction/transfer_stub_rpc_simulate | 40 | 2.794 | 4.754 | 4.511 | 6.729 | 8.664 |
| analyzeTransaction/transfer_stub_rpc_no_sim | 40 | 2.188 | 7.512 | 4.567 | 27.679 | 44.144 |
| api.inject/GET_health | 40 | 0.235 | 0.844 | 0.513 | 2.665 | 5.504 |
| api.inject/POST_normalize | 40 | 3.631 | 5.404 | 4.775 | 10.050 | 11.973 |
| api.inject/POST_analyze | 40 | 3.632 | 5.678 | 5.707 | 6.362 | 13.816 |

Variance across runs is expected (GC, CPU turbo, background load). Outliers in a single sample do not justify invented “typical” numbers.

## Honesty rules

- Do not invent latency figures for README, pitch, or social posts.
- Do not treat faster analyze as safer analyze.
- Prefer publishing the full min/mean/p50/p95/max table plus environment metadata.
