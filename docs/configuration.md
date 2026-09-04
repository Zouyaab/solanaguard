# Configuration

Copy `.env.example` to `.env` for the API and CLI. Never commit secrets. Do not put seed phrases or private keys in env files.

## Core

| Variable | Default | Purpose |
| --- | --- | --- |
| `SOLANA_RPC_URL` | `https://api.devnet.solana.com` | Cluster JSON-RPC endpoint |
| `SOLANA_NETWORK` | `devnet` | `devnet` \| `testnet` \| `mainnet-beta` \| `localnet` (label only; URL is authoritative for calls) |
| `API_HOST` | `127.0.0.1` | Bind address |
| `API_PORT` | `3001` | Bind port |
| `DATABASE_URL` | _(empty)_ | Reserved; unused in MVP |

## Hardening (API)

| Variable | Default | Purpose |
| --- | --- | --- |
| `RPC_TIMEOUT_MS` | `20000` | Per-RPC HTTP timeout |
| `API_BODY_LIMIT_BYTES` | `16384` | Max JSON body size |
| `API_REQUEST_TIMEOUT_MS` | `60000` | Inbound request timeout (`0` disables) |
| `RATE_LIMIT_MAX` | `60` | Max requests per client per window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate-limit window |

Details: [security-model.md](./security-model.md).

## Dashboard

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SOLANAGUARD_API_URL` | `http://127.0.0.1:3001` | API base URL for `apps/web` (set in `apps/web/.env.local` if needed) |

## Tests and benches

| Variable | Default | Purpose |
| --- | --- | --- |
| `SOLANAGUARD_DEVNET_IT` | unset | Set to `1` to enable live Devnet tests |
| `SOLANAGUARD_BENCH_WARMUP` | `5` | Bench warm-up iterations |
| `SOLANAGUARD_BENCH_ITERATIONS` | `40` | Timed bench iterations |

See [testing.md](./testing.md) and [benchmarks.md](./benchmarks.md).
