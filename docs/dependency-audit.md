# Dependency audit notes

## CI gate

CI runs `pnpm audit:prod`, which deploys the `@solanaguard/api` production tree and
audits that tree at `--audit-level=high`. This matches the Docker/runtime surface.

## Full workspace audit

`pnpm audit --prod --audit-level=high` may still report high findings outside the API
image, currently under:

- `apps/web` → `next` → `sharp` / `postcss`
- `examples/wallet-demo` → Solana wallet adapter → `react-native` / `metro` → `image-size`

Those packages are not included in the API container. Track upstream upgrades
(`next`, wallet adapter) rather than ignoring the advisory with `|| true`.

Workspace overrides in `pnpm-workspace.yaml` force newer `postcss` where the resolver
can apply them.
