# Limitations

This document exists so SolanaGuard does not over-claim.

## Phase 1

- No transaction is analyzed.
- Process health "ok" means the HTTP process is running, not that Solana is reachable.

## Phase 2

- RPC calls are real (`getHealth`, `getSlot`, `getAccountInfo`, `getTransaction`, `simulateTransaction`).
- `GET /api/v1/rpc/status` reports cluster reachability separately from process health.
- A missing account or missing signature is `null` / HTTP 404. That is not a risk finding.
- Simulation exists as an RPC client method (Phase 2) and as `POST /api/v1/transactions/simulate` (Phase 9).
- Live Devnet tests run only when `SOLANAGUARD_DEVNET_IT=1`.

## Phase 3

- Transactions can be normalized from bytes, base64, web3.js objects, or a confirmed signature.
- Unresolved address lookup tables mean the message is incomplete locally, not that the transaction is unsafe.

## Phase 4

- Known programs may decode to named accounts and args. That is a structured view, not a risk finding.
- Unknown programs stay `decoded: false` / `unknown_program`. That is missing coverage, not evidence of malice.
- HTTP `POST /api/v1/transactions/normalize` still returns no risk report.

## Phase 5

- When RPC is available, unique accounts are fetched. `not_found` means the cluster has no account, not that the transaction is unsafe.
- Address lookup tables can be loaded from account data. Failure to load them is incomplete data.
- Sync local normalize still does not call RPC.

## Phase 6

- Keys are labeled `on_curve` or `off_curve`. Off-curve often matches program-derived addresses.
- The tool does not recover seeds and does not claim that a key "is a PDA".
- Off-curve required signers are unusual for Ed25519. That is not by itself evidence of malice.

## Phase 7

- Deterministic rules emit findings. An empty list means no built-in rule fired, not that the transaction is safe.
- Unknown programs and missing accounts still mean incomplete data.

## Phase 8

- A numeric score is a capped weighted sum of finding severities (`info` 5, `unusual` 20, `needs_review` 35).
- The response includes a per-finding contribution list and the weights used.
- Score 0 / band `no_findings` is not a pass. High scores are not proof of an attack.
- `evaluate-rules` stays findings-only; `score` returns evaluation + score.

## Phase 9

- Simulation is a cluster preview with `replaceRecentBlockhash` and without signature verification.
- A successful simulation is not a safety verdict and can differ from later execution.

## Phase 10

- Expected effects come from decoded instructions only.
- Observations compare those expectations to a simulation preview.
- `matched` is not a pass. `diverged` is not evidence of an attack. Gaps stay `incomplete`.
- Token amounts are not fully verified until token account balances are parsed.
- Fee-payer lamport checks allow an extra fee debit without asserting the exact fee.

## Permanent technical limits (later phases must still respect these)

- We cannot recover arbitrary PDA seeds from an address.
- Off-curve is not evidence of malice. It often means "program-derived address or otherwise not an Ed25519 public key".
- Simulation can differ from what the cluster later executes (slot, blockhash, competing transactions, program upgrades).
- Unknown programs cannot be fully decoded. The honest result is `decoded: false`.
- A risk score is a weighted rule total, not a proof of safety or of attack.
- This software does not replace a security audit.
