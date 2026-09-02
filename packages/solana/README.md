# @solanaguard/solana

Phase 2: Solana RPC wrapper around `@solana/web3.js` `Connection`.

This package talks to a real cluster (Devnet by default). It does **not** analyze risk.

## What it does

- `getHealth` / `getSlot` / `getLatestBlockhash`
- `getAccount` / `getMultipleAccounts` / `getBalance`
- `getTransaction` (returns `null` if the signature is not on the cluster)
- `getTransactionWire` (serialized bytes plus confirmation metadata; `null` if missing)
- `simulateTransaction` for a `VersionedTransaction` or its bytes, including inner instructions and requested post-state accounts when the RPC returns them
- Strips API keys from endpoint labels used in logs and HTTP responses

## What it does not do

- It does not decide if a transaction is safe.
- Simulation success is not a security guarantee.
- `getTransaction` of an unknown signature returns `null`. That is not evidence of malice.

## Live Devnet tests

```bash
SOLANAGUARD_DEVNET_IT=1 pnpm test
```

These are off in CI so a public RPC outage cannot fail the build.
