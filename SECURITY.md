# Security Policy

SolanaGuard analyzes Solana transactions **without** taking custody of keys. Reports are observational: a score, finding list, or simulation is **not** a safety verdict.

## Supported versions

| Version | Supported |
| --- | --- |
| `0.1.x` (this repository’s current line) | Yes — best-effort while the project is pre-1.0 |
| Older / unreleased forks | No guarantee |

Pre-1.0 APIs may change. Security fixes are applied to the current default branch when feasible.

## What is in scope

Report privately if you find issues such as:

- Acceptance or logging of seed phrases / private keys / mnemonics
- Path for an operator or client to exfiltrate signing material through SolanaGuard
- Auth bypass, unintended data exposure, or remote code execution in `apps/api` or related packages
- Dependency or supply-chain issues that affect this repository’s published packages
- Documentation that falsely instructs users to paste secrets into SolanaGuard

## What is out of scope (for this policy)

- “My transaction scored low / high” without a concrete tool defect
- Public Solana RPC abuse, rate limits, or third-party cluster downtime
- Wallet or dApp bugs outside this repository
- Asking us to declare a third-party program “malicious” or “safe”

## How to report a vulnerability

**Do not** open a public GitHub issue for undisclosed vulnerabilities.

1. Prefer **GitHub Security Advisories** (private vulnerability reporting) on this repository when enabled.
2. If advisories are not yet enabled, contact the maintainers privately through the repository’s listed owner / organization channels and mark the message as a security report.
3. Include: affected package or path, SolanaGuard version or commit, reproduction steps, impact, and whether any secrets were involved (never paste real seed phrases — use placeholders).

We aim to acknowledge reports within **7 days** and to share a remediation plan or status update within **30 days** when the report is actionable. Timelines may vary for pre-1.0 work.

## Coordinated disclosure

Please give maintainers reasonable time to fix and publish before public disclosure. We will credit reporters who want acknowledgment, unless they prefer to remain anonymous.

## Hardening reference

Operational edge controls (body limits, timeouts, rate limiting, forbidden secret fields) are described in [docs/security-model.md](./docs/security-model.md). Those controls reduce abuse; they do **not** make analysis reports into safety proofs.
