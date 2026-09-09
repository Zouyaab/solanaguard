# Releasing SolanaGuard

SolanaGuard uses semantic versioning for the monorepo root and shared packages (`0.1.0` today).

## Versioning

- Keep `package.json` / `packages/*/package.json` versions aligned when cutting a release.
- `SOLANAGUARD_VERSION` in `@solanaguard/types` must match the release tag.
- Document user-visible changes in `CHANGELOG.md` under a dated section before tagging.

## Tag and GitHub Release

1. Ensure `master` is green (`pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:coverage`, `pnpm build`, `pnpm audit:prod`).
2. Move Unreleased changelog entries into a new `## [x.y.z] - YYYY-MM-DD` section.
3. Commit the changelog/version bump.
4. Tag annotated: `git tag -a v0.1.0 -m "SolanaGuard v0.1.0"`.
5. Push the tag: `git push origin v0.1.0`.
6. `.github/workflows/release.yml` creates a GitHub Release for `v*` tags.

Packages are **not** auto-published to npm. Publishing is intentional and out of band.

## What a release proves

- Offline tests pass without Devnet (`SOLANAGUARD_DEVNET_IT` unset).
- API `/api/v1/health` and `/api/v1/metrics` work without Solana RPC.
- Docker Compose builds the API image.
