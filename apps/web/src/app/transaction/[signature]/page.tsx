import { ResourceLookup } from "@/components/ResourceLookup";

export default async function TransactionPage({
  params,
}: {
  params: Promise<{ signature: string }>;
}) {
  const { signature } = await params;
  return (
    <main className="space-y-6">
      <h1 className="font-display text-4xl text-ink">Transaction</h1>
      <ResourceLookup kind="transaction" id={decodeURIComponent(signature)} />
    </main>
  );
}
