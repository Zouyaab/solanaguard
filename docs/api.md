# SolanaGuard REST API

Phase 11 documents the HTTP surface. Interactive OpenAPI lives at `/documentation` when the API is running. Machine-readable OpenAPI JSON is at `/api/v1/openapi.json`.

None of these endpoints is a safety verdict.

## System

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/health` | Process is up (not RPC reachability) |
| GET | `/api/v1/version` | Name, version, current phase, disclaimer |
| GET | `/api/v1/openapi.json` | OpenAPI 3 document |
| GET | `/documentation` | Swagger UI |

## RPC helpers

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/rpc/status` | Configured cluster reachability |
| GET | `/api/v1/account/:address` | Account snapshot |
| GET | `/api/v1/program/:programId` | Program account + `executable` flag |
| GET | `/api/v1/transaction/:signature` | Confirmed transaction fetch |

Missing accounts/signatures are HTTP 404. That is not a risk finding.

## Transaction body

Most POST transaction routes accept JSON:

```json
{ "base64": "<wire transaction>" }
```

or:

```json
{ "signature": "<confirmed signature>" }
```

Provide exactly one of `base64` or `signature`. Signature lookup requires RPC.

`POST /api/v1/analyze/transaction` also accepts optional `includeSimulation` (boolean, default `true`).

## Analysis

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/analyze/transaction` | Composed report: normalize + rules + score + optional simulation/comparison |
| POST | `/api/v1/simulate/transaction` | Simulation preview (alias of `/api/v1/transactions/simulate`) |

Granular Phase 3–10 routes remain:

| Method | Path |
| --- | --- |
| POST | `/api/v1/transactions/normalize` |
| POST | `/api/v1/transactions/evaluate-rules` |
| POST | `/api/v1/transactions/score` |
| POST | `/api/v1/transactions/simulate` |
| POST | `/api/v1/transactions/compare` |

## Errors

| Code | Meaning |
| --- | --- |
| 400 | Invalid body/params |
| 404 | Account/signature/program not found on cluster |
| 429 | Rate limit exceeded |
| 502 | Upstream RPC failure |
| 503 | API started without an RPC client |

## Hardening

Body limits, timeouts, rate limiting, and rejection of private-key / seed-phrase fields are enabled by default. See [security-model.md](./security-model.md) and [configuration.md](./configuration.md).

Hardening reduces abuse; it does **not** make analysis reports into safety proofs.
