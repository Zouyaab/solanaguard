# @solanaguard/risk-engine

**Phase 7:** deterministic rule framework. **Not** a score, **not** a safety verdict.

Rules are pure functions over a `NormalizedTransaction`. They emit findings (`info`, `unusual`, `needs_review`). They must not call RPC and must not use the words safe, secure, or malicious as a verdict.

Built-in rules cover unknown programs, unrecognized layouts, unresolved lookup/program ids, off-curve required signers, missing cluster accounts (when resolution ran), and unsigned messages.

Override a rule by `id` with `mergeRules(defaultRiskRules, extras)`.

Scoring is Phase 8 and is not implemented here.
