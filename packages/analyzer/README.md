# @solanaguard/analyzer

Phases 3–6: transaction input → `NormalizedTransaction` with decoder plugins, optional account resolution, and Ed25519 on/off-curve labels.

Decoding, resolution, and curve class are **not** a risk assessment. This package does not simulate or score risk. It does not recover PDA seeds.

## What it does

Accepts:

- raw bytes (`Uint8Array`)
- base64 wire format
- `@solana/web3.js` `VersionedTransaction`
- `@solana/web3.js` legacy `Transaction`
- a confirmed signature (loads wire bytes via `@solanaguard/solana`)

It returns a structured view: version, fee payer, account keys (signer/writable/on-curve), compiled instructions, address-table lookups, signatures, `curveClassification`, and (when RPC is provided to `normalizeTransaction`) cluster snapshots in `resolvedAccounts`.

Off-curve keys are common for program-derived addresses. That label is **not** evidence of malice. On-curve is **not** proof of a user wallet.

Built-in plugins cover System Program, Compute Budget, SPL Memo (v1/v2), and SPL Token / Token-2022 Transfer, TransferChecked, and CloseAccount. Extra plugins can override by `programId`.

Unknown programs stay `decoded: false` with `decodeStatus: "unknown_program"`. Missing cluster accounts stay `presence: "not_found"`. If a v0 message references lookup tables but loaded addresses were not supplied and tables cannot be fetched, `lookupsUnresolved` is `true`.

`normalizeLocalTransaction` is synchronous and does not call RPC. Curve class still runs locally.

## What it does not do

- It does not decide if a transaction is safe.
- It does not recover PDA seeds or prove that a key is a PDA.
- It does not run risk rules.
