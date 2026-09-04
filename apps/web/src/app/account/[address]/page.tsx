import { ResourceLookup } from "@/components/ResourceLookup";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  return (
    <main className="space-y-6">
      <h1 className="font-display text-4xl text-ink">Account</h1>
      <ResourceLookup kind="account" id={decodeURIComponent(address)} />
    </main>
  );
}
