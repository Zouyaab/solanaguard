# @solanaguard/sdk

Typed HTTP client for the SolanaGuard REST API (Phase 12).

Analysis reports are **not** a safety verdict. A low score, matched comparison, or successful simulation does not mean a transaction is safe.

## Install (workspace)

```bash
pnpm add @solanaguard/sdk --filter <your-package>
```

## Quick start

```ts
import { createSolanaGuardClient, analyzeTransaction } from "@solanaguard/sdk";

const client = createSolanaGuardClient({
  baseUrl: "http://127.0.0.1:3001",
});

const report = await client.analyzeTransaction({
  base64: "<wire transaction>",
});

console.log(report.score.band);
console.log(report.evaluation.findings);
console.log(report.note); // always present disclaimer

// One-shot helper (still needs baseUrl — there is no hidden default API):
const again = await analyzeTransaction("<wire transaction>", {
  baseUrl: "http://127.0.0.1:3001",
});
```

## Inputs

| Input | API body |
| --- | --- |
| `{ base64 }` | passed through |
| `{ signature }` | passed through (API needs RPC) |
| `Uint8Array` | `{ base64: <encoded> }` |
| `string` | treated as base64 |

Serialize `@solana/web3.js` transactions to bytes/base64 before calling the SDK. The SDK does not accept private keys and never signs.

Optional on analyze only: `includeSimulation: false` skips cluster simulation/comparison.

## Methods

- `health`, `version`, `rpcStatus`
- `getAccount`, `getProgram`, `getTransaction`
- `analyzeTransaction`, `simulateTransaction`
- `normalizeTransaction`, `evaluateRules`, `scoreTransaction`, `compareTransaction`

## Errors

| Class | When |
| --- | --- |
| `SolanaGuardRequestError` | Invalid local input |
| `SolanaGuardNetworkError` | Transport / timeout / non-JSON |
| `SolanaGuardNotFoundError` | HTTP 404 |
| `SolanaGuardApiError` | Other non-2xx API responses |

See [docs/sdk.md](../../docs/sdk.md) for more detail.
