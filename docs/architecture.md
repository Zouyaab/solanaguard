# Architecture

## Decision: separate repository

SolanaGuard is a TypeScript monorepo. It is not part of `clearscript-imr` (Python OCR). The products share no runtime, data, or compliance boundary.

## Decision: pnpm workspaces + TypeScript project references

- One lockfile
- Packages compile with `tsc -b`
- Internal imports use `workspace:*`

## Decision: Fastify for the API

Low-overhead HTTP, first-class TypeScript types, and `inject()` for tests without binding a port. Phase 1 still also listens on a real port in one test so "the application starts" is not only mocked.

## Decision: @solanaguard/analyzer owns normalize, decode, resolve, and curve class

Phase 3 accepts bytes, base64, web3.js objects, or a confirmed signature. Phase 4 runs decoder plugins for known programs. Phase 5 fetches account snapshots and can load address lookup tables via RPC. Phase 6 labels keys on-curve or off-curve. Off-curve is common for program-derived addresses and is not treated as malice. Seeds are not recovered. RPC I/O stays in `@solanaguard/solana`.

## Decision: @solanaguard/risk-engine owns deterministic rules

Phase 7 evaluates pure rules over a `NormalizedTransaction`. Findings are observations that may require review. Empty findings does not mean the transaction is safe.

Phase 8 scores those findings with published severity weights and a capped total. The breakdown lists every contribution. A score of 0 means no built-in rule fired — not that the transaction is safe.

Phase 9 maps `simulateTransaction` into a structured `SimulationReport` (logs, units, inner instructions, requested post-state accounts). Simulation uses `replaceRecentBlockhash` and does not verify signatures. It is a cluster preview, not a safety verdict.

Phase 10 derives expected effects from decoded instructions and compares them to the simulation preview (`matched` / `diverged` / `incomplete` / `not_applicable`). A clean comparison is not a proof of safety.

Phase 11 exposes the composed analyze/simulate REST surface and OpenAPI documentation. The API orchestrates packages; it does not invent findings. Rate limiting is added in Phase 16.

Phase 12 ships `@solanaguard/sdk` as a thin typed HTTP client. It depends on `@solanaguard/types` only, never signs, and never claims safety.

Phase 13 completes the developer CLI (`analyze`, `program`, `transaction`, plus prior commands). Human-readable analyze output stays observational.

Phase 14 adds the Next.js dashboard (`apps/web`) as an SDK client. The UI must keep the same honesty language as the API and CLI.

Phase 15 ships `examples/wallet-demo`: connect on Devnet, analyze an unsigned draft, require explicit review before any sign/send. Mainnet is refused.

Phase 16 hardens the API edge (body limits, timeouts, rate limiting, forbidden signing-material fields). Hardening is not a safety proof.

Phase 17 adds fixture-based offline pipeline tests and opt-in live Devnet cases under `tests/`. Results remain observational.

Phase 18 adds measured micro-benchmarks (`pnpm bench`). Reported timings must come from a real run; inventing latency numbers is forbidden. Speed is not a safety metric.

Phase 19 adds root OSS community files (`CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`). Policy docs do not change analysis semantics.

Phase 20 completes the documentation set (`docs/README.md` index, overview, configuration, rules, testing). Docs describe shipped behavior only.

## Decision: no database in Phase 1

Nothing is persisted. `DATABASE_URL` is parsed so later phases can add SQLite without renaming env vars. An empty value means "unused".

## Decision: @solana/web3.js v1 Connection for RPC

Phase 2 uses `@solana/web3.js` `Connection` because it is the stable API for `getAccountInfo`, `getTransaction({ maxSupportedTransactionVersion: 0 })`, and `simulateTransaction` on Versioned transactions. The rest of the repo talks to `SolanaRpc`, not to `Connection` directly.

## Decision: no on-chain program in MVP

Analysis is an off-chain developer tool. A program does not make parsing safer. A future optional program might publish signed rule-set versions; that is documented as non-MVP.

## Decision: deterministic core

`packages/risk-engine` is pure functions over a normalized transaction. Network I/O lives in `packages/solana`. The API only orchestrates. Phase 7 emits findings. Phase 8 adds a transparent score on top of the same findings.

## Package responsibilities (target)

| Package                    | Responsibility                                          |
| -------------------------- | ------------------------------------------------------- |
| `@solanaguard/types`       | Shared constants and public types                       |
| `@solanaguard/config`      | Env parsing                                             |
| `@solanaguard/solana`      | RPC wrapper (Phase 2)                                   |
| `@solanaguard/analyzer`    | Normalize (3), decode (4), resolve (5), curve class (6), simulate (9), compare (10), analyze compose (11/13) |
| `@solanaguard/risk-engine` | Rules (Phase 7) + transparent score (Phase 8)           |
| `@solanaguard/sdk`         | HTTP client for apps/api (Phase 12)                     |
| `@solanaguard/api`         | HTTP surface + OpenAPI (Phase 11)                       |
| `@solanaguard/cli`         | Developer CLI (Phase 13 full commands)                  |
| `apps/web`                 | Next.js dashboard (Phase 14)                            |

## Request path (Phase 11 analyze / Phase 16 hardened)

1. Validate and size-limit input (JSON schema + body limit + packet-sized base64)
2. Reject forbidden signing-material fields
3. Normalize transaction
4. Decode known programs; mark others `decoded: false`
5. Fetch account data (RPC when available; RPC calls use configured timeouts)
6. Simulate when RPC is configured and `includeSimulation` is not false
7. Evaluate rules and transparent score
8. Return composed report (`TransactionAnalysisReport`)

Rate limiting applies per client IP (health/version/OpenAPI exempt). Simulation is **not** a security guarantee.
