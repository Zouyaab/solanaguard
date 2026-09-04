/**
 * Public, cluster-stable addresses. These are not fabricated chain snapshots —
 * they are well-known Solana program ids that exist on Devnet/Mainnet alike.
 */
import { ComputeBudgetProgram, SystemProgram } from "@solana/web3.js";

export const WELL_KNOWN = {
  systemProgram: SystemProgram.programId.toBase58(),
  /** Native loader owner for executable BPF/native programs. */
  nativeLoader: "NativeLoader1111111111111111111111111111111",
  tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  memoV2: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
  computeBudget: ComputeBudgetProgram.programId.toBase58(),
} as const;
