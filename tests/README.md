# tests/

Phase 17 fixture and Devnet integration tests live here. Unit tests stay next to source (`*.test.ts`).

## Layout

| Path | Purpose |
| --- | --- |
| `fixtures/well-known.ts` | Public program ids (System, Token, Memo, …) |
| `fixtures/transactions.ts` | Locally built transfer / memo / unknown-program txs |
| `fixtures/mock-rpc.ts` | Explicit stub RPC for offline pipeline tests |
| `analyze.fixtures.test.ts` | Offline full analyze pipeline (always runs in CI) |
| `pipeline.devnet.test.ts` | Live Devnet cases (`SOLANAGUARD_DEVNET_IT=1`) |

## Rules

- Prefer **locally constructed** transactions over checked-in wire dumps.
- Do **not** check in fabricated chain data that pretends to be recorded RPC responses.
- Stub RPC in offline tests must be obvious test doubles.
- Live Devnet tests stay opt-in so public RPC flakes do not fail CI.

```bash
# Offline fixtures (CI)
pnpm test

# Include live Devnet cases
set SOLANAGUARD_DEVNET_IT=1
pnpm test
# or
pnpm test:devnet
```

Reports and simulations from these tests are not safety verdicts.
