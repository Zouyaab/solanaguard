# examples/

Phase 15 Devnet wallet integration demos live here.

## wallet-demo

Vite + React demo that:

1. Connects a Solana wallet (Devnet)
2. Drafts a tiny unsigned self-transfer
3. Sends wire bytes to SolanaGuard for analysis
4. Shows the report
5. Requires an explicit review checkbox before any sign/send

It never auto-signs, never collects seed phrases/private keys, and refuses mainnet RPC URLs.

```bash
pnpm dev                                          # API on :3001
pnpm --filter @solanaguard/wallet-demo dev        # demo on :5173
```

See [examples/wallet-demo/README.md](./wallet-demo/README.md).
