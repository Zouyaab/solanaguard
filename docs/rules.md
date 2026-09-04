# Built-in rules and scoring

Rules live in `@solanaguard/risk-engine` and run as pure functions over a `NormalizedTransaction`. Findings are observations that may require review. They are **not** a safety verdict and must not use “malicious” / “safe” as conclusions.

## Default rules

| Rule id | Severity | When it fires |
| --- | --- | --- |
| `unknown_program` | `needs_review` | Instruction targets a program with no decoder plugin |
| `unrecognized_layout` | `needs_review` | Known program, data layout not parsed |
| `unresolved_program_id` | `needs_review` | Lookup tables / program ids not fully loaded |
| `signer_off_curve` | `unusual` | Required signer is off the Ed25519 curve (unusual; not by itself malice; seeds not recovered) |
| `account_not_found` | `info` | Account resolution ran and one or more keys were missing on the cluster |
| `unsigned_message` | `info` | Payload has no signatures yet (message preview) |

Empty findings means **no built-in rule fired**, not that the transaction is safe.

## Scoring

`evaluateAndScore` / `scoreEvaluation` apply published weights:

| Severity | Points |
| --- | --- |
| `info` | 5 |
| `unusual` | 20 |
| `needs_review` | 35 |

- Total is capped (default 100).
- Response includes per-finding contributions and the weights used.
- Bands: `no_findings` (0), `informational` (<20), `elevated` (<50), `requires_review` (≥50).

Override or extend rules with `mergeRules(defaultRiskRules, extras)` by `id`. Custom rules must keep the honesty language in [limitations.md](./limitations.md).

## Package notes

See also [../packages/risk-engine/README.md](../packages/risk-engine/README.md).
