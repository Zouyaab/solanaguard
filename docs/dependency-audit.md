# Dependency audit notes

## CI gate

CI runs `pnpm audit:prod`, which deploys the `@solanaguard/api` production tree and
audits that tree at `--audit-level=high`. This matches the Docker/runtime surface.

## Full workspace audit

`pnpm audit --prod --audit-level=high` may still report findings outside the API
image. As of the current lockfile:

| Advisory surface | Path | Mitigation |
| ---------------- | ---- | ---------- |
| `sharp` (libvips / libheif) | `apps/web` → `next` → `sharp` | Workspace override `sharp: ^0.35.4` in `pnpm-workspace.yaml` |
| `image-size` DoS | `examples/wallet-demo` → wallet-adapter → `react-native`/`metro` | No patched `image-size@>=2.0.3` on npm yet (latest published `2.0.2`); track upstream wallet-adapter / metro |

Those packages are **not** included in the API container. Do not silence audits with
`|| true`. Re-run `pnpm audit --prod --audit-level=high` after Next / wallet-adapter upgrades.

Workspace overrides also force newer `postcss` where the resolver can apply them.

## Transitive dependency visibility

pnpm stores the full graph in `pnpm-lock.yaml`. Evaluators that report
`total_transitive_deps = 0` usually mis-parse pnpm lockfiles; use
`pnpm list -r --depth Infinity` (or the lockfile) for the real graph.
