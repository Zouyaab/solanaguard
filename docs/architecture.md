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

Phase 7 evaluates pure rules over a `NormalizedTransaction`. Findings are observations that may require review. There is no score yet. Empty findings does not mean the transaction is safe.

## Decision: no database in Phase 1

Nothing is persisted. `DATABASE_URL` is parsed so later phases can add SQLite without renaming env vars. An empty value means "unused".

## Decision: @solana/web3.js v1 Connection for RPC

Phase 2 uses `@solana/web3.js` `Connection` because it is the stable API for `getAccountInfo`, `getTransaction({ maxSupportedTransactionVersion: 0 })`, and `simulateTransaction` on Versioned transactions. The rest of the repo talks to `SolanaRpc`, not to `Connection` directly.

## Decision: no on-chain program in MVP

Analysis is an off-chain developer tool. A program does not make parsing safer. A future optional program might publish signed rule-set versions; that is documented as non-MVP.

## Decision: deterministic core

`packages/risk-engine` is pure functions over a normalized transaction. Network I/O lives in `packages/solana`. The API only orchestrates. Phase 7 emits findings. Phase 8 will add a transparent score on top of the same findings.

## Package responsibilities (target)

| Package                    | Responsibility                                          |
| -------------------------- | ------------------------------------------------------- |
| `@solanaguard/types`       | Shared constants and public types                       |
| `@solanaguard/config`      | Env parsing                                             |
| `@solanaguard/solana`      | RPC wrapper (Phase 2)                                   |
| `@solanaguard/analyzer`    | Normalize (3), decode (4), resolve (5), curve class (6) |
| `@solanaguard/risk-engine` | Rules (Phase 7); score later (Phase 8)                  |
| `@solanaguard/sdk`         | HTTP client for apps/api (Phase 12)                     |
| `@solanaguard/api`         | HTTP surface                                            |
| `@solanaguard/cli`         | Developer CLI                                           |
| `apps/web`                 | Dashboard (Phase 14)                                    |

## Request path (future)

1. Validate and size-limit input
2. Normalize transaction
3. Decode known programs; mark others `decoded: false`
4. Fetch account data (RPC)
5. Simulate when a complete signed-or-fee-payer message allows it
6. Evaluate rules
7. Return report + score breakdown

Simulation is **not** a security guarantee. It will be labeled as such in the API.
