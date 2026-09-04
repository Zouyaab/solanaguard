# SolanaGuard wallet demo (Devnet)

**Development / test environment only.** Reports are not safety verdicts. This app never auto-signs and never asks for seed phrases or private keys.

## Flow

1. Connect a Wallet Standard wallet configured for **Devnet**
2. Draft an unsigned 1000-lamport self-transfer
3. Analyze the draft via `@solanaguard/sdk` → SolanaGuard API
4. Review the report
5. Check the confirmation box, then optionally **Sign and send on Devnet**

Signing is disabled until the review checkbox is checked. `autoConnect` is off.

## Run

```bash
# terminal 1
pnpm dev

# terminal 2
pnpm --filter @solanaguard/wallet-demo dev
```

Open http://127.0.0.1:5173

Optional env (see `.env.example`):

```text
VITE_SOLANAGUARD_API_URL=http://127.0.0.1:3001
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

Mainnet endpoints are rejected by the demo helpers.
