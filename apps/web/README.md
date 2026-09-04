# apps/web — SolanaGuard dashboard (Phase 14)

Next.js App Router UI that calls `@solanaguard/sdk` against the Fastify API.

Reports shown here are **not** safety verdicts.

## Run

```bash
# terminal 1 — API
pnpm dev

# terminal 2 — dashboard
pnpm --filter @solanaguard/web dev
```

Open http://127.0.0.1:3000

Optional env (see `.env.example`):

```text
NEXT_PUBLIC_SOLANAGUARD_API_URL=http://127.0.0.1:3001
```

## Pages

| Path | Purpose |
| --- | --- |
| `/` | Dashboard + quick lookups |
| `/analyze` | Paste base64 or signature |
| `/account/[address]` | Account fetch |
| `/program/[programId]` | Program fetch |
| `/transaction/[signature]` | Confirmed transaction fetch |
| `/docs` | Short integration notes |
