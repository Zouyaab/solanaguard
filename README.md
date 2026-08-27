# SolanaGuard

Open-source transaction safety and risk analysis infrastructure for Solana.

> **Phase 6 status:** Transactions can be normalized, decoded, resolved, and classified as on-curve or off-curve. Off-curve is **not** evidence of malice. The risk engine, SDK, dashboard, and risk reports are **not implemented yet**. Do not treat this repository as a security product.

## What is this?

SolanaGuard is intended to become a developer-facing layer that:

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
| Transaction risk analysis                            | **Not implemented** (Phases 7–10) |
| REST analyze endpoints                               | **Not implemented** (Phase 11)    |
| SDK                                                  | **Not implemented** (Phase 12)    |
| Full CLI analyze commands                            | **Not implemented** (Phase 13)    |
| Web dashboard                                        | **Not implemented** (Phase 14)    |
| Wallet demo                                          | **Not implemented** (Phase 15)    |
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
POST http://127.0.0.1:3001/api/v1/transactions/normalize
  {"base64":"<wire transaction>"}
```

CLI (after `pnpm build`):

```bash
pnpm cli -- --version
pnpm cli -- rpc-status
pnpm cli -- account 11111111111111111111111111111111
pnpm cli -- normalize --base64 <TX>
```

Live Devnet unit-test extras:

```bash
set SOLANAGUARD_DEVNET_IT=1
pnpm test
```

## Workspace layout

```text
apps/api          Fastify HTTP service (health/version in Phase 1)
cli               Command-line entry (help/version in Phase 1)
packages/types    Shared version and type constants
packages/config   Environment parsing
packages/solana   RPC wrapper (Phase 2)
packages/analyzer Transaction normalize, decode, resolve, curve class (Phases 3–6)
packages/risk-engine Planned rules (Phases 7–8)
packages/sdk      Planned TypeScript client (Phase 12)
apps/web          Planned Next.js dashboard (Phase 14)
docs              Architecture and plan
```

## Security posture

- This tool must never collect seed phrases, private keys, or wallet passwords.
- Transactions are analyzed without obtaining signing authority.
- Secrets belong in `.env`, which is gitignored.
- `.env.example` contains public Devnet defaults only.

## Documentation

- [PROJECT_PLAN.md](./PROJECT_PLAN.md) — phased delivery
- [docs/architecture.md](./docs/architecture.md) — architecture decisions
- [docs/limitations.md](./docs/limitations.md) — what we will not claim

## License

MIT
