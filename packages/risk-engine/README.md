# @solanaguard/risk-engine

**Phase 7:** deterministic rule findings. **Phase 8:** transparent weighted score on top of those findings.

Rules are pure functions over a `NormalizedTransaction`. They emit findings (`info`, `unusual`, `needs_review`). They must not call RPC and must not use the words safe, secure, or malicious as a verdict.

Scoring (`scoreEvaluation` / `evaluateAndScore`) adds points by severity, returns a capped total, a band, and a per-finding contribution list. A total of **0** means no built-in rule fired — **not** that the transaction is safe. The score is not a proof of attack either.

Default weights (exported as `DEFAULT_SEVERITY_WEIGHTS`):

| Severity       | Points |
| -------------- | ------ |
| `info`         | 5      |
| `unusual`      | 20     |
| `needs_review` | 35     |

Bands: `no_findings` (0), `informational` (<20), `elevated` (<50), `requires_review` (≥50). Cap defaults to 100.

Override a rule by `id` with `mergeRules(defaultRiskRules, extras)`.
