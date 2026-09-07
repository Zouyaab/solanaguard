import { classifyAddress } from "@solanaguard/analyzer";
import type { NormalizedAccount } from "@solanaguard/solana";

/** JSON-safe account view for RPC lookup responses. */
export function jsonAccount(account: NormalizedAccount) {
  const curve = classifyAddress(account.address);
  return {
    address: account.address,
    lamports: account.lamports.toString(),
    owner: account.owner,
    executable: account.executable,
    rentEpoch: account.rentEpoch?.toString() ?? null,
    dataLength: account.dataLength,
    dataBase64: account.dataBase64,
    onCurve: curve.onCurve,
    curveClass: curve.curveClass,
  };
}
