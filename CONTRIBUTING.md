# Contributing to SolanaGuard

Thanks for helping improve SolanaGuard. This project is an **off-chain analysis tool**. Analysis reports, scores, and simulations are **not** safety verdicts.

## Before you start

1. Read [docs/README.md](./docs/README.md), [docs/limitations.md](./docs/limitations.md), and [docs/security-model.md](./docs/security-model.md).
2. Prefer small, reviewable pull requests over large mixed changes.
3. Do not invent features, latency claims, or risk language that the code does not support.

## Honesty language (required)

Never claim **secure**, **safe**, **malicious**, **recoverable**, or **unrecoverable** without evidence in code or docs.

Prefer: *potentially risky*, *requires review*, *unknown*, *could not determine*, *simulation indicates*, *program ownership indicates*.

Empty findings, score `0`, or a successful simulation still mean **incomplete coverage or a cluster preview** — not a pass.

## What not to contribute

- Seed phrases, private keys, wallet passwords, or any signing material (in code, fixtures, logs, or issues)
- Fabricated chain data presented as recorded RPC responses
- Invented benchmark numbers (run `pnpm bench` and cite the measured output)
- Auto-sign behavior in demos or the dashboard
- AI that overrides deterministic rules

## Development setup

Requirements: Node.js 20+, pnpm 10+.

```bash
copy .env.example .env
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Useful commands:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | API on Devnet-configured RPC |
| `pnpm test:devnet` | Opt-in live Devnet tests |
| `pnpm bench` | Measured offline micro-benchmarks |
| `pnpm cli -- --help` | CLI after build |

## Pull request checklist

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass locally
- [ ] Docs match behavior (no “implemented” claims for unfinished work)
- [ ] User-facing strings keep the honesty language above
- [ ] No secrets or signing material in the diff
- [ ] New rules/decoders include tests and do not label unknown coverage as malice

## Reporting bugs

Use GitHub issues for non-security bugs. Include reproduction steps, SolanaGuard version (`GET /api/v1/version`), and whether RPC was local/stub/Devnet.

For **security** issues, follow [SECURITY.md](./SECURITY.md) — do not open a public issue for undisclosed vulnerabilities.

## Code of conduct

Participation is governed by [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions are licensed under the MIT License ([LICENSE](./LICENSE)).
