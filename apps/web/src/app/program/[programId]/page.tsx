import { ResourceLookup } from "@/components/ResourceLookup";

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  return (
    <main className="space-y-6">
      <h1 className="font-display text-4xl text-ink">Program</h1>
      <ResourceLookup kind="program" id={decodeURIComponent(programId)} />
    </main>
  );
}
