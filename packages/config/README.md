# @solanaguard/config

Parses process environment into a typed `SolanaGuardConfig`.

- Loads `.env` via `dotenv` when `loadConfig()` is called
- Validates network name, ports, and positive integers for hardening knobs
- `DATABASE_URL` may be empty — persistence is out of MVP

See [docs/configuration.md](../../docs/configuration.md). Empty config values do not imply transaction safety.
