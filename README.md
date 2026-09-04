# SolanaGuard

Open-source transaction safety and risk analysis infrastructure for Solana.

> **Phase 20 status:** MVP documentation is complete (`docs/README.md`). Analysis reports, scores, and simulations remain **not** safety verdicts.

## What is this?

SolanaGuard is a developer-facing layer that:

1. Accepts a Solana transaction (serialized bytes, base64, SDK object, or confirmed signature)
2. Parses instructions and accounts
3. Optionally simulates the transaction against a Solana RPC
4. Runs a **deterministic, auditable** rule engine
5. Returns an explainable risk report **before** a wallet or dApp signs

The primary audience is wallet developers, dApp developers, security researchers, and tooling teams.

AI will never be the security decision-maker. If an explanation layer is added later, it will only describe findings that the rule engine already produced.

## Why a new repository?

The currently open workspace (`clearscript-imr`) is a Python Streamlit medical-form OCR application. SolanaGuard is a TypeScript Solana developer tool. Mixing them would pollute both products. This repository is standalone:

`C:\Users\Zouyaab Hussain\solanaguard`

## Current capabilities (honest)

| Capability                                           | Status                            |
| ---------------------------------------------------- | --------------------------------- |
| Monorepo, TypeScript, lint, format, tests, CI        | Implemented (Phase 1)             |
| Config loading (`SOLANA_RPC_URL`, `API_PORT`, …)     | Implemented                       |
| HTTP API health + version                            | Implemented                       |
| CLI `--version` / help                               | Implemented                       |
| Solana RPC client                                    | Implemented (Phase 2)             |
| GET `/api/v1/rpc/status`, `/account`, `/transaction` | Implemented (read-only RPC)       |
| CLI `rpc-status` / `account`                         | Implemented                       |
| Transaction normalization (`NormalizedTransaction`)  | Implemented (Phase 3)             |
| POST `/api/v1/transactions/normalize`                | Implemented (includes decode)     |
| CLI `normalize --base64` / `--signature`             | Implemented                       |
| Instruction decoding (plugin registry)               | Implemented (Phase 4)             |
| Account resolution (RPC snapshots + ALT load)        | Implemented (Phase 5)             |
| On/off-curve key classification                      | Implemented (Phase 6)             |
| Deterministic rule findings                          | Implemented (Phase 7)             |
| Transparent risk score                               | Implemented (Phase 8)             |
| Simulation normalization                             | Implemented (Phase 9)             |
| Expected vs simulated comparison                     | Implemented (Phase 10)            |
| Transaction risk analysis                            | Implemented (composed analyze)    |
| REST analyze endpoints + OpenAPI                     | Implemented (Phase 11)            |
| SDK (`@solanaguard/sdk`)                             | Implemented (Phase 12)            |
| Full CLI analyze commands                            | Implemented (Phase 13)            |
| Web dashboard                                        | Implemented (Phase 14)            |
| Wallet demo (Devnet, no auto-sign)                   | Implemented (Phase 15)            |
| API hardening (limits, timeouts, rate limit)         | Implemented (Phase 16)            |
| Fixture + opt-in Devnet tests                        | Implemented (Phase 17)            |
| Measured micro-benchmarks (`pnpm bench`)             | Implemented (Phase 18)            |
| CONTRIBUTING / SECURITY / CODE_OF_CONDUCT            | Implemented (Phase 19)            |
| Docs completeness (index + reference set)            | Implemented (Phase 20)            |
| On-chain program                                     | **Not planned for MVP**           |

## Requirements

- Node.js 20+ (developed against Node 22)
- pnpm 10+ (this machine has pnpm 11)

## Quick start

```bash
cd solanaguard
copy .env.example .env
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

Then:

```text
GET http://127.0.0.1:3001/api/v1/health
GET http://127.0.0.1:3001/api/v1/version
GET http://127.0.0.1:3001/api/v1/rpc/status
GET http://127.0.0.1:3001/api/v1/account/11111111111111111111111111111111
GET http://127.0.0.1:3001/api/v1/program/11111111111111111111111111111111
POST http://127.0.0.1:3001/api/v1/analyze/transaction
  {"base64":"<wire transaction>"}
POST http://127.0.0.1:3001/api/v1/simulate/transaction
  {"base64":"<wire transaction>"}
POST http://127.0.0.1:3001/api/v1/transactions/normalize
  {"base64":"<wire transaction>"}
POST http://127.0.0.1:3001/api/v1/transactions/evaluate-rules
  {"base64":"<wire transaction>"}
POST http://127.0.0.1:3001/api/v1/transactions/score
  {"base64":"<wire transaction>"}
POST http://127.0.0.1:3001/api/v1/transactions/simulate
  {"base64":"<wire transaction>"}
POST http://127.0.0.1:3001/api/v1/transactions/compare
  {"base64":"<wire transaction>"}
OpenAPI UI: http://127.0.0.1:3001/documentation
OpenAPI JSON: http://127.0.0.1:3001/api/v1/openapi.json
```

CLI (after `pnpm build`):

```bash
pnpm cli -- --version
pnpm cli -- rpc-status
pnpm cli -- account 11111111111111111111111111111111
pnpm cli -- program 11111111111111111111111111111111
pnpm cli -- transaction <SIGNATURE>
pnpm cli -- normalize --base64 <TX>
pnpm cli -- rules --base64 <TX>
pnpm cli -- score --base64 <TX>
pnpm cli -- simulate --base64 <TX>
pnpm cli -- compare --base64 <TX>
pnpm cli -- analyze --base64 <TX>
pnpm cli -- analyze --json --no-simulation --base64 <TX>
```

Dashboard (API must already be running):

```bash
pnpm dev:web
# http://127.0.0.1:3000
```

Wallet demo (API must already be running; Devnet wallet required to sign):

```bash
pnpm --filter @solanaguard/wallet-demo dev
# http://127.0.0.1:5173
```

SDK (against a running API):

```ts
import { createSolanaGuardClient } from "@solanaguard/sdk";

const client = createSolanaGuardClient({ baseUrl: "http://127.0.0.1:3001" });
const report = await client.analyzeTransaction({ base64: "<TX>" });
console.log(report.score.band, report.evaluation.findings);
```

Live Devnet extras (opt-in; not part of default CI):

```bash
pnpm test:devnet
# equivalent: set SOLANAGUARD_DEVNET_IT=1 && pnpm test
```

Offline fixture pipeline tests under `tests/` always run with `pnpm test`.

Measured offline micro-benchmarks:

```bash
pnpm bench
```

See [docs/benchmarks.md](./docs/benchmarks.md). Do not invent latency numbers.

## Workspace layout

```text
apps/api          Fastify HTTP service (analyze/simulate + OpenAPI in Phase 11)
cli               Developer CLI (full analyze commands in Phase 13)
packages/types    Shared version and type constants
packages/config   Environment parsing
packages/solana   RPC wrapper (Phase 2)
packages/analyzer    Transaction normalize, decode, resolve, curve class, simulate, compare (Phases 3–6, 9–10)
packages/risk-engine Deterministic rules + transparent score (Phases 7–8)
packages/sdk      Typed HTTP client for apps/api (Phase 12)
apps/web          Next.js dashboard (Phase 14)
examples/wallet-demo  Devnet wallet demo (Phase 15)
tests             Fixture + opt-in Devnet pipeline tests (Phase 17)
benchmarks        Measured micro-benchmarks (Phase 18)
docs              Documentation index (Phase 20) — start at docs/README.md
```

## Security posture

- This tool must never collect seed phrases, private keys, or wallet passwords.
- Transactions are analyzed without obtaining signing authority.
- Secrets belong in `.env`, which is gitignored.
- `.env.example` contains public Devnet defaults only.

## Documentation

Start at **[docs/README.md](./docs/README.md)** (full index).

- [PROJECT_PLAN.md](./PROJECT_PLAN.md) — phased delivery (1–20)
- [CONTRIBUTING.md](./CONTRIBUTING.md) — how to contribute
- [SECURITY.md](./SECURITY.md) — vulnerability disclosure
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) — community standards
- [docs/overview.md](./docs/overview.md) — how pieces fit
- [docs/configuration.md](./docs/configuration.md) — environment variables
- [docs/api.md](./docs/api.md) — REST endpoints and OpenAPI
- [docs/sdk.md](./docs/sdk.md) — TypeScript SDK
- [docs/cli.md](./docs/cli.md) — CLI commands
- [docs/dashboard.md](./docs/dashboard.md) — Next.js dashboard
- [docs/wallet-demo.md](./docs/wallet-demo.md) — Devnet wallet demo
- [docs/rules.md](./docs/rules.md) — built-in rules and scoring
- [docs/architecture.md](./docs/architecture.md) — architecture decisions
- [docs/security-model.md](./docs/security-model.md) — hardening and trust boundaries
- [docs/testing.md](./docs/testing.md) — tests and verification
- [docs/benchmarks.md](./docs/benchmarks.md) — measured micro-benchmarks
- [docs/limitations.md](./docs/limitations.md) — what we will not claim

## License

MIT
