# @solanaguard/sdk

Phase 12 typed client for the SolanaGuard HTTP API.

The SDK talks to `apps/api` over HTTP. It does not embed the analyzer or risk engine, and it does not sign transactions or handle private keys.

## Create a client

```ts
import { createSolanaGuardClient } from "@solanaguard/sdk";

const client = createSolanaGuardClient({
  baseUrl: "http://127.0.0.1:3001",
  // fetch: customFetch,       // optional
  // headers: { "X-Request-Id": "…" },
  // timeoutMs: 30_000,
});
```

## Analyze

```ts
const report = await client.analyzeTransaction({
  base64: "<wire transaction>",
  // includeSimulation: false, // skip RPC simulate/compare
});

// report.transaction — NormalizedTransaction
// report.evaluation — rule findings
// report.score — transparent score + breakdown
// report.simulation / report.comparison — null when skipped or no RPC
// report.note — disclaimer (always present)
```

One-shot helper (still requires `baseUrl`):

```ts
import { analyzeTransaction } from "@solanaguard/sdk";

const report = await analyzeTransaction("<base64>", {
  baseUrl: "http://127.0.0.1:3001",
});
```

## Other methods

| Method | API |
| --- | --- |
| `health()` | `GET /api/v1/health` |
| `version()` | `GET /api/v1/version` |
| `rpcStatus()` | `GET /api/v1/rpc/status` |
| `getAccount(address)` | `GET /api/v1/account/:address` |
| `getProgram(programId)` | `GET /api/v1/program/:programId` |
| `getTransaction(signature)` | `GET /api/v1/transaction/:signature` |
| `simulateTransaction(input)` | `POST /api/v1/simulate/transaction` |
| `normalizeTransaction(input)` | `POST /api/v1/transactions/normalize` |
| `evaluateRules(input)` | `POST /api/v1/transactions/evaluate-rules` |
| `scoreTransaction(input)` | `POST /api/v1/transactions/score` |
| `compareTransaction(input)` | `POST /api/v1/transactions/compare` |

## Honesty

- Empty findings / score `0` / band `no_findings` is not a pass.
- Successful simulation is a cluster preview, not a guarantee.
- Matched comparison observations are not a proof of safety.
- Prefer the language in `report.note`, `score.note`, and `simulation.note`.

See also [docs/api.md](./api.md) and [docs/limitations.md](./limitations.md).
