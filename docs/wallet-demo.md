# Wallet integration demo

Example app in `examples/wallet-demo` (`@solanaguard/wallet-demo`).

## Purpose

Show how a wallet or dApp can:

1. Connect a wallet on **Devnet only**
2. Draft an unsigned test transaction (self-transfer)
3. Send wire bytes to SolanaGuard (API via SDK)
4. Display the analysis report
5. Require explicit user review before any sign/send of the **same** draft that was analyzed

## Non-negotiables

- Devnet only (mainnet RPC URLs are rejected by demo helpers)
- No auto-sign (`autoConnect` is off; sign stays gated behind confirmation)
- No seed phrases, private keys, or wallet passwords collected by the demo
- Reports remain observational — not safety verdicts
- Analysis before sign does **not** mean the transaction is safe

## Run

```bash
# terminal 1 — API must be running
pnpm dev

# terminal 2
pnpm dev:demo
# http://127.0.0.1:5173
```

A Devnet-funded wallet is required only if you choose to sign/send after review.

## Related

- [sdk.md](./sdk.md) — client used by the demo
- [security-model.md](./security-model.md) — trust boundary
- [dashboard.md](./dashboard.md) — non-wallet browser UI
