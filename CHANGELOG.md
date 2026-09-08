# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- Frontend component tests for the Next.js dashboard (`AnalyzeForm`, `AnalysisReportView`, `ResourceLookup`, `LookupForm`)
- Wallet demo flow tests covering connect → draft → analyze → review → sent without a live wallet or Devnet
- Lightweight API error-tracking abstraction (`apps/api/src/error-tracking.ts`) for unexpected 5xx failures
- Root runtime dependency declarations for the workspace product surface (`api`, `cli`, `sdk`, `web`, Solana/React)

### Changed

- Vitest now includes `*.test.tsx` and runs dashboard/demo UI tests in jsdom with mocked API/SDK/wallet clients
- Coverage collection includes `apps/web` components/lib and `DemoApp.tsx`
- CI job names and `pnpm run …` invocations made explicit so lint, typecheck, coverage, audit, and build hard-gate the pipeline

### Security

- Error tracking redacts sensitive message content and never logs private keys, mnemonics, or auth headers
