# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-09-09

First tagged release of the SolanaGuard monorepo (API, CLI, SDK, analyzer, risk-engine, web, wallet demo).

### Added

- API route modules under `apps/api/src/routes/` (`system`, `rpc`, `transactions`, `analyze`) with `app.ts` as composition only
- Analyzer comparison split into `compare-effects`, `compare-instructions`, and `compare-state` with orchestration in `compare.ts`
- Metrics fields `clientErrorTotal` / `serverErrorTotal` and analysis-duration recording (no payloads)
- OpenAPI contract test covering documented public paths
- Offline-guarantee Vitest + CI step proving Devnet is not required for default tests
- Release workflow (`.github/workflows/release.yml`) and `docs/releasing.md`
- Expanded risk-engine boundary/determinism coverage and SDK network/timeout failure tests
- Frontend component tests for the Next.js dashboard (`AnalyzeForm`, `AnalysisReportView`, `ResourceLookup`, `LookupForm`)
- Wallet demo flow tests covering connect → draft → analyze → review → sent without a live wallet or Devnet
- Lightweight API error-tracking abstraction (`apps/api/src/error-tracking.ts`) for unexpected 5xx failures
- Root runtime dependency declarations for the workspace product surface (`api`, `cli`, `sdk`, `web`, Solana/React)

### Changed

- CI split into lint, typecheck, test/audit, build, and docker jobs with `permissions: contents: read`
- Coverage thresholds raised to 75% lines/statements/functions (branches remain 70%)
- Unexpected API 500 responses always return a generic `Internal server error` body (no stack leakage)
- Vitest now includes `*.test.tsx` and runs dashboard/demo UI tests in jsdom with mocked API/SDK/wallet clients
- Coverage collection includes `apps/web` components/lib and `DemoApp.tsx`
- Workspace `sharp` override raised to `^0.35.4` for Next.js image tooling advisories

### Security

- Domain RPC/analysis errors map through `sendRpcError` with structured tracking for unexpected failures only
- Error tracking redacts sensitive message content and never logs private keys, mnemonics, or auth headers

### Testing

- Additional API, metrics, risk-engine, SDK, compare, and offline-guarantee specs

### Infrastructure

- GitHub Release creation on `v*` tags (no automatic npm publish)

## Unreleased

### Added

_(none yet)_
