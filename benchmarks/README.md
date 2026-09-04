# Benchmarks

Phase 18 ships **measured** micro-benchmarks. Numbers come from running the harness on a real machine — they are not invented marketing claims.

## Run

```bash
pnpm bench
```

Optional:

```bash
set SOLANAGUARD_BENCH_ITERATIONS=100
pnpm bench
```

## Layout

| Path | Purpose |
| --- | --- |
| `run.ts` | Timed workloads (analyze + API inject) |
| `stats.ts` | Percentile / summary helpers over measured samples |
| `stats.test.ts` | Unit tests for stats math |

## Rules

- Do not invent latency numbers for README, pitch decks, or social posts.
- Re-run `pnpm bench` on the target machine before quoting results.
- Record Node version, OS, CPU, and date with any published sample.
- Throughput/latency is **not** a safety or correctness metric.

See [docs/benchmarks.md](../docs/benchmarks.md) for methodology and a sample measured run.
