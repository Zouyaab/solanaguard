# SolanaGuard project plan

This is the working delivery plan. Each phase is only "done" when install/build/lint/tests for that phase pass, and no unimplemented capability is described as working.

## Current phase: 7 (risk rules framework)

**Do not start later phases until the operator says `continue`.**

## Repository inspection (starting point)

Inspected workspace: `C:\Users\Zouyaab Hussain\clearscript-imr`

What existed:

- Python 3 Streamlit application for IPR form OCR (`app.py`)
- Local Ollama vision OCR, login, SQLite activity log, Salesforce send
- No Node.js workspace, no Solana libraries, no TypeScript packages

Decision: create a **new** repository at `C:\Users\Zouyaab Hussain\solanaguard` rather than embedding a Solana toolchain inside a PHI-handling medical app.

## Architecture (target)

```text
Wallet / dApp / CLI / Web
          │
          ▼
   @solanaguard/sdk  ──HTTP──►  apps/api (Fastify)
                                  │
                                  ▼
                    packages/analyzer
                      ├─ normalize transaction
                      ├─ decode instructions (plugin per program)
                      ├─ resolve accounts / PDA classification
                      └─ expected-vs-simulated behavior
                                  │
                                  ▼
                    packages/risk-engine  (deterministic rules)
                                  │
                                  ▼
                    packages/solana  (RPC + simulateTransaction)
```

On-chain program: **out of MVP**. An off-chain analysis API does not need a program unless we later want a public rule-version registry. That would be a future, optional design.

Database: **none in Phase 1**. Add SQLite only when we persist reports or API keys. Keep `DATABASE_URL` in env as a reserved slot.

AI: **out of MVP**. Optional explanation later; cannot override rules.

## Phases

| Phase | Name                                                        | Status                      |
| ----- | ----------------------------------------------------------- | --------------------------- |
| 1     | Monorepo, TS, lint, test, CI, health API                    | **done (verified locally)** |
| 2     | Solana RPC client (Devnet), health/slot/account/tx/simulate | **done (verified locally)** |
| 3     | Transaction input + `NormalizedTransaction`                 | **done (verified locally)** |
| 4     | Instruction parser + decoder plugins                        | **done (verified locally)** |
| 5     | Account resolution                                          | **done (verified locally)** |
| 6     | PDA / off-curve classification (no false malice)            | **done (verified locally)** |
| 7     | Risk rules framework                                        | **done (verified locally)** |
| 8     | Transparent scoring                                         | pending                     |
| 9     | Simulation normalization                                    | pending                     |
| 10    | Expected vs simulated behavior                              | pending                     |
| 11    | REST API analyze/simulate + OpenAPI                         | pending                     |
| 12    | `@solanaguard/sdk`                                          | pending                     |
| 13    | Full CLI commands                                           | pending                     |
| 14    | Next.js dashboard                                           | pending                     |
| 15    | Wallet integration demo (Devnet, no auto-sign)              | pending                     |
| 16    | Hardening (limits, timeouts, rate limit, no key handling)   | pending                     |
| 17    | Fixture-based tests including real Devnet cases             | pending                     |
| 18    | Benchmarks (measured, not invented)                         | pending                     |
| 19    | OSS files (CONTRIBUTING, SECURITY, CODE_OF_CONDUCT)         | pending                     |
| 20    | Docs completeness                                           | pending                     |

## Phase 1 definition of done

- `pnpm install` succeeds
- `pnpm lint` succeeds
- `pnpm typecheck` succeeds
- `pnpm test` succeeds
- `pnpm build` succeeds
- API health route works (in-process inject **and** real listen)
- CLI `--version` works
- No secrets committed
- No fake transaction analysis

## Phase 3 definition of done

- Bytes, base64, `VersionedTransaction`, legacy `Transaction`, and confirmed signatures normalize to `NormalizedTransaction`
- Lookup-table messages without loaded addresses set `lookupsUnresolved: true`
- `POST /api/v1/transactions/normalize` and `solanaguard normalize` work
- Docs do not describe this as a risk analysis product

## Phase 4 definition of done

- Known programs (system, compute budget, memo, SPL Token transfer/close) decode when the layout is understood
- Unknown programs stay `decoded: false` / `unknown_program`
- Unresolved program ids in ALT messages stay `unresolved_program_id`
- Decoder plugins are overridable by program id
- Notes and docs do not treat decoding as a risk or safety verdict

## Phase 5 definition of done

- Unique account keys are fetched via RPC `getMultipleAccounts` when a client is provided
- Snapshots use `found` / `not_found`; missing accounts are not described as malice
- Address lookup tables are loaded from account data when local bytes omit loaded addresses
- Sync `normalizeLocalTransaction` still does no RPC I/O
- PDA / off-curve classification is not attempted
- Docs do not treat account resolution as a risk verdict

## Phase 6 definition of done

- Account keys are labeled on-curve or off-curve via Ed25519
- Off-curve is described as common for program-derived addresses, not as malice
- Seeds are not recovered; the tool does not claim a key "is a PDA"
- Required signers that are off-curve are flagged as unusual, not malicious
- Docs keep the same language

## Phase 7 definition of done

- Rules are pure functions over `NormalizedTransaction` (no RPC inside the engine)
- Built-in rules emit `info` / `unusual` / `needs_review` findings
- Unknown programs, unresolved ids, off-curve signers, and missing accounts are not described as malice
- There is no numeric score
- `POST /api/v1/transactions/evaluate-rules` and `solanaguard rules` work
- Docs do not treat an empty findings list as "safe"

## Language rules (permanent)

Never claim: secure, safe, malicious, recoverable, unrecoverable without evidence.

Prefer: potentially risky, requires review, unknown, could not determine, simulation indicates, program ownership indicates.
