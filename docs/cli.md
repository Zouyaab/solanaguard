# SolanaGuard CLI

Developer CLI (`cli/`) that talks to the configured Solana RPC via `@solanaguard/solana` and local packages. Output is observational — **not** a safety verdict.

## Run

```bash
pnpm build
pnpm cli -- --help
pnpm cli -- --version
```

Requires `.env` / environment as in [configuration.md](./configuration.md) (`SOLANA_RPC_URL`, etc.).

## Commands

| Command | Purpose |
| --- | --- |
| `--version` / `-v` | Print package version |
| `rpc-status` | Cluster reachability for configured RPC |
| `account <ADDRESS>` | Account snapshot + curve class |
| `program <PROGRAM_ID>` | Program account; `executable` is not a safety verdict |
| `transaction <SIGNATURE>` | Confirmed transaction fetch |
| `normalize …` | `NormalizedTransaction` JSON |
| `rules …` | Findings only (no score object on the evaluation alone) |
| `score …` | Evaluation + transparent score |
| `simulate …` | Simulation preview |
| `compare …` | Expected vs simulated observations |
| `analyze …` | Composed report (human text by default) |

Transaction commands accept `--base64 <TX>`, `--signature <SIGNATURE>`, or a positional base64 string.

### Analyze flags

| Flag | Effect |
| --- | --- |
| `--json` | Full `TransactionAnalysisReport` JSON |
| `--no-simulation` | Skip simulate/compare (still normalizes and scores) |

Examples:

```bash
pnpm cli -- analyze --base64 <TX>
pnpm cli -- analyze --json --no-simulation --base64 <TX>
pnpm cli -- program 11111111111111111111111111111111
pnpm cli -- transaction <SIGNATURE>
```

## Analyze report (human mode)

Default `analyze` prints:

- score band and total
- findings (or an explicit empty-findings note — empty is not a pass)
- simulation summary when run
- comparison summary when run
- the composed disclaimer note

## Related surfaces

- Web dashboard: `pnpm dev:web` — [dashboard.md](./dashboard.md)
- Wallet demo: `pnpm dev:demo` — [wallet-demo.md](./wallet-demo.md)
- HTTP API: [api.md](./api.md)
