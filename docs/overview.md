# Overview

SolanaGuard is an off-chain analysis stack for Solana transactions. It helps wallets and dApps inspect a transaction **before** signing. It does not take custody of keys and does not issue safety verdicts.

## Request path

```text
Client (SDK / CLI / dashboard / wallet demo)
        │
        ▼
 apps/api  (Fastify; hardened HTTP edge)
        │
        ▼
 @solanaguard/analyzer
   normalize → decode → resolve → (optional) simulate/compare
        │
        ▼
 @solanaguard/risk-engine
   deterministic findings → transparent score
        │
        ▼
 @solanaguard/solana
   RPC reads + simulateTransaction
```

## Choose a surface

| Goal | Use |
| --- | --- |
| HTTP integration | [api.md](./api.md) + OpenAPI at `/documentation` |
| TypeScript client | [sdk.md](./sdk.md) |
| Local developer CLI | [cli.md](./cli.md) |
| Browser UI | [dashboard.md](./dashboard.md) |
| Wallet connect demo | [wallet-demo.md](./wallet-demo.md) |

## Honest reading of a report

A `TransactionAnalysisReport` may include:

- decoded structure and account snapshots
- rule findings and a weighted score
- optional simulation and expected-vs-simulated comparison

Interpret carefully:

| Observation | Means |
| --- | --- |
| Empty findings / score `0` | No built-in rule fired — **not** a pass |
| Successful simulation | Cluster preview with `replaceRecentBlockhash` — **not** a guarantee |
| `matched` comparison | Expectations aligned with that preview — **not** proof of safety |
| `unknown_program` | Missing decoder coverage — **not** evidence of malice |

See [limitations.md](./limitations.md) and [rules.md](./rules.md).

## Out of MVP

- On-chain program / rule registry
- Persistence (`DATABASE_URL` is reserved but unused)
- AI that overrides deterministic rules
