# SolanaGuard dashboard

Next.js App Router UI in `apps/web` (`@solanaguard/web`). The dashboard is an HTTP client of the REST API via `@solanaguard/sdk`. It does **not** embed private keys and does **not** sign transactions.

## Run

```bash
# terminal 1
pnpm dev          # API on :3001

# terminal 2
pnpm dev:web      # dashboard on :3000
```

Open http://127.0.0.1:3000

Optional env in `apps/web/.env.local`:

```text
NEXT_PUBLIC_SOLANAGUARD_API_URL=http://127.0.0.1:3001
```

See [configuration.md](./configuration.md).

## Pages

| Path | Purpose |
| --- | --- |
| `/` | Landing / quick lookups |
| `/analyze` | Paste base64 or signature; render composed report |
| `/account/[address]` | Account fetch |
| `/program/[programId]` | Program fetch |
| `/transaction/[signature]` | Confirmed transaction fetch |
| `/docs` | Short in-app notes |

## Honesty

Every analyze view includes a disclaimer: reports are not safety verdicts. Empty findings are not a pass. Successful simulation is a cluster preview only. A polished UI does not change the meaning of scores or simulations.

For wallet connect + explicit review-before-sign, use the [wallet demo](./wallet-demo.md) instead of this dashboard.
