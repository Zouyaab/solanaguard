# Testing and verification

Default CI stays offline (no public Devnet dependency). Reports produced in tests are still not safety verdicts.

## Standard gate

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Unit tests live next to source (`*.test.ts`). Offline fixture pipeline tests live under `tests/` (Phase 17).

## Live Devnet (opt-in)

```bash
pnpm test:devnet
# or: set SOLANAGUARD_DEVNET_IT=1 && pnpm test
```

Covers RPC smoke checks and a live analyze/simulate path. Public RPC can flake; failures here are not treated as CI blockers by default.

## Benchmarks (measured)

```bash
pnpm bench
```

See [benchmarks.md](./benchmarks.md). Do not invent latency numbers.

## Fixture rules

- Prefer locally constructed transactions (`tests/fixtures/`).
- Do not check in fabricated chain dumps presented as recorded RPC responses.
- Stub RPC in offline tests must be obvious test doubles.

Details: [../tests/README.md](../tests/README.md).
