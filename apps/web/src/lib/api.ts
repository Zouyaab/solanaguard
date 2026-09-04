import { createSolanaGuardClient } from "@solanaguard/sdk";

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SOLANAGUARD_API_URL ?? "http://127.0.0.1:3001";
}

export function createWebClient() {
  return createSolanaGuardClient({ baseUrl: getApiBaseUrl() });
}
