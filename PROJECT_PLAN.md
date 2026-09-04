# SolanaGuard project plan

This is the working delivery plan. Each phase is only "done" when install/build/lint/tests for that phase pass, and no unimplemented capability is described as working.

## Current phase: 20 (docs completeness) — MVP documentation complete

Phases 1–20 are delivered. Further work is backlog unless the operator starts a new plan.

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
| 8     | Transparent scoring                                         | **done (verified locally)** |
| 9     | Simulation normalization                                    | **done (verified locally)** |
| 10    | Expected vs simulated behavior                              | **done (verified locally)** |
| 11    | REST API analyze/simulate + OpenAPI                         | **done (verified locally)** |
| 12    | `@solanaguard/sdk`                                          | **done (verified locally)** |
| 13    | Full CLI commands                                           | **done (verified locally)** |
| 14    | Next.js dashboard                                           | **done (verified locally)** |
| 15    | Wallet integration demo (Devnet, no auto-sign)              | **done (verified locally)** |
| 16    | Hardening (limits, timeouts, rate limit, no key handling)   | **done (verified locally)** |
| 17    | Fixture-based tests including real Devnet cases             | **done (verified locally)** |
| 18    | Benchmarks (measured, not invented)                         | **done (verified locally)** |
| 19    | OSS files (CONTRIBUTING, SECURITY, CODE_OF_CONDUCT)         | **done (verified locally)** |
| 20    | Docs completeness                                           | **done (verified locally)** |

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

## Phase 8 definition of done

- Scoring is a pure function over `RuleEvaluation` findings (no RPC inside scoring)
- Default severity weights and cap are exported and documented
- Each finding contributes an explicit `points` + `reason` line in the breakdown
- Total 0 / band `no_findings` means no built-in rule fired, not that the transaction is safe
- `POST /api/v1/transactions/score` and `solanaguard score` return evaluation + score
- `evaluate-rules` remains findings-only (no score field) for Phase 7 callers
- Docs do not treat the score as a proof of safety or of attack

## Phase 9 definition of done

- RPC `simulateTransaction` results are mapped to a structured `SimulationReport`
- Simulation uses `replaceRecentBlockhash: true` and `sigVerify: false`
- Post-state accounts and inner instructions are included when the RPC returns them
- `POST /api/v1/transactions/simulate` and `solanaguard simulate` work
- Docs state that simulation is a cluster preview, not a safety verdict
- Expected-vs-simulated comparison is not claimed (Phase 10)

## Phase 10 definition of done

- Expected effects are derived from decoded instructions (pure)
- Comparison against a `SimulationReport` emits `matched` / `diverged` / `incomplete` / `not_applicable` observations
- Fee-payer lamport checks allow an extra fee debit without asserting the exact fee
- Undecoded instructions and unparsed token balances are incomplete, not malice
- `POST /api/v1/transactions/compare` and `solanaguard compare` work
- Docs state that comparison observations are not a safety verdict

## Phase 11 definition of done

- `POST /api/v1/analyze/transaction` returns a composed report (normalize + rules + score + optional simulation/comparison)
- `POST /api/v1/simulate/transaction` aliases simulation
- `GET /api/v1/program/:programId` returns executable account metadata without a safety verdict
- Existing Phase 2–10 routes remain available under `/api/v1/...`
- Request bodies/params are schema-validated
- OpenAPI 3 is served at `/documentation` and `/api/v1/openapi.json`
- Docs state that analysis reports are not a safety verdict

## Phase 12 definition of done

- `@solanaguard/sdk` is a typed HTTP client over the Phase 11 API
- `createSolanaGuardClient` / `SolanaGuardClient` expose analyze, simulate, normalize, rules, score, compare, and RPC helpers
- `analyzeTransaction(input, { baseUrl })` convenience helper works
- Inputs accept `{ base64 }`, `{ signature }`, `Uint8Array`, or base64 `string`
- Errors distinguish request, network, not-found, and API failures
- Package depends on `@solanaguard/types` only (no private keys, no signing)
- Docs state that SDK results are not a safety verdict

## Phase 13 definition of done

- `solanaguard analyze` prints a human-readable report (and `--json` for the composed object)
- `solanaguard program <PROGRAM_ID>` and `solanaguard transaction <SIGNATURE>` work
- Existing normalize/rules/score/simulate/compare commands remain
- Transaction commands accept `--base64`, `--signature`, or a positional base64 string
- `analyze --no-simulation` skips simulate/compare
- Help no longer lists analyze/program as unimplemented
- Docs state that CLI reports are not a safety verdict

## Phase 14 definition of done

- Next.js App Router dashboard at `apps/web` (`@solanaguard/web`)
- Pages: `/`, `/analyze`, `/account/[address]`, `/program/[programId]`, `/transaction/[signature]`, `/docs`
- Analyzer accepts base64 or signature and renders score, findings, simulation, comparison, instructions, accounts
- Dashboard uses `@solanaguard/sdk` against `NEXT_PUBLIC_SOLANAGUARD_API_URL`
- UI shows an explicit “not a safety verdict” disclaimer
- `pnpm --filter @solanaguard/web build` succeeds

## Phase 15 definition of done

- `examples/wallet-demo` connects a wallet on Devnet only
- Demo drafts an unsigned test transaction, analyzes it via the API/SDK, and shows the report
- Sign/send stays disabled until an explicit review confirmation
- `autoConnect` is off; no seed phrases or private keys are collected
- Mainnet RPC URLs are refused by demo helpers
- Docs label the demo as a development/test environment

## Phase 16 definition of done

- Configurable RPC timeout, API body limit, request timeout, and rate limit via env
- `@fastify/rate-limit` applied globally (health/version/OpenAPI exempt)
- Transaction base64 payloads are bounded to the Solana packet size
- Request bodies that include private-key / seed-phrase fields are rejected
- API never documents or accepts signing material
- `docs/security-model.md` describes the trust boundary
- Docs state that hardening does not make reports into safety verdicts

## Phase 17 definition of done

- `tests/fixtures/` holds locally built transaction builders and well-known program ids
- Offline fixture tests cover analyze for transfer, memo, unknown program, unsigned, and stub-RPC simulate
- Live Devnet pipeline tests exist under `tests/pipeline.devnet.test.ts` and stay gated by `SOLANAGUARD_DEVNET_IT=1`
- `pnpm test:devnet` enables the gate; default `pnpm test` (CI) stays offline
- No fabricated chain dumps are checked in
- Docs state that fixture/Devnet results are not safety verdicts

## Phase 18 definition of done

- `pnpm bench` runs measured offline workloads (analyze fixtures + API inject)
- Output includes environment metadata and min/mean/p50/p95/max from real samples
- `docs/benchmarks.md` records methodology and a sample run that was actually measured
- Docs forbid inventing latency claims and state that speed is not a safety metric
- Default CI (`pnpm test`) does not require live RPC for benches

## Phase 19 definition of done

- Root `CONTRIBUTING.md` covers setup, PR checklist, and honesty language
- Root `SECURITY.md` describes private disclosure and in/out of scope
- Root `CODE_OF_CONDUCT.md` adapts Contributor Covenant 2.1
- README links to the three files
- Docs state that community policy files do not change analysis meaning

## Phase 20 definition of done

- `docs/README.md` indexes all product and internal docs
- Overview, configuration, rules, and testing docs exist and match implementation
- CLI / dashboard / wallet-demo docs describe current behavior (no stale “not implemented”)
- CLI help no longer claims the web dashboard is unimplemented
- README points at the docs index and reflects Phases 1–20
- Docs still state that reports are not safety verdicts

## Language rules (permanent)

Never claim: secure, safe, malicious, recoverable, unrecoverable without evidence.

Prefer: potentially risky, requires review, unknown, could not determine, simulation indicates, program ownership indicates.
