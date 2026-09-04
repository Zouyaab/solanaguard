# @solanaguard/api

Fastify HTTP service in `apps/api`.

- Orchestrates `@solanaguard/analyzer`, `@solanaguard/risk-engine`, and `@solanaguard/solana`
- Serves OpenAPI at `/documentation` and `/api/v1/openapi.json`
- Applies Phase 16 hardening (limits, timeouts, rate limit, forbidden secret fields)

```bash
pnpm dev
# http://127.0.0.1:3001/api/v1/health
```

Docs: [docs/api.md](../../docs/api.md), [docs/security-model.md](../../docs/security-model.md).

Analysis responses are not safety verdicts.
