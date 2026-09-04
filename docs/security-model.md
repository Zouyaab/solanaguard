# Security model

SolanaGuard is an off-chain analysis tool. Phase 16 hardens the HTTP edge without changing the honesty rules: reports are still not safety verdicts.

## What we never do

- Collect, store, or log seed phrases, private keys, or wallet passwords
- Accept signing material on API request bodies (`privateKey`, `secretKey`, `mnemonic`, …)
- Auto-sign transactions in demos or the dashboard
- Treat process health, scores, or simulations as proof of safety

## What Phase 16 enforces

| Control | Default | Env |
| --- | --- | --- |
| JSON body size limit | 16384 bytes | `API_BODY_LIMIT_BYTES` |
| Inbound request timeout | 60000 ms (0 disables) | `API_REQUEST_TIMEOUT_MS` |
| RPC HTTP timeout | 20000 ms | `RPC_TIMEOUT_MS` |
| Rate limit | 60 requests / 60000 ms per client | `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` |
| Transaction base64 length | Solana 1232-byte packet bound | enforced in API helpers |
| Forbidden secret fields | rejected with HTTP 400 | — |

Health, version, and OpenAPI document routes skip rate limiting so operators can probe liveness.

## Trust boundaries

- Wallets/dApps keep signing keys. SolanaGuard receives wire bytes or confirmed signatures only.
- RPC credentials in `SOLANA_RPC_URL` stay in process env; they are not returned in analysis reports.
- Logging must not dump raw request bodies.

## Remaining work

Dependency auditing automation may still improve over time. Public disclosure process and contribution norms live in [SECURITY.md](../SECURITY.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).
