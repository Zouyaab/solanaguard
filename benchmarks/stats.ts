/** Pure timing stats used by the bench harness. Values come from measured samples only. */

export interface SampleStats {
  name: string;
  iterations: number;
  minMs: number;
  meanMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return Number.NaN;
  }
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)]!;
}

export function summarize(name: string, samplesMs: number[]): SampleStats {
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const sum = samplesMs.reduce((acc, value) => acc + value, 0);
  return {
    name,
    iterations: samplesMs.length,
    minMs: sorted[0] ?? Number.NaN,
    meanMs: samplesMs.length === 0 ? Number.NaN : sum / samplesMs.length,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    maxMs: sorted[sorted.length - 1] ?? Number.NaN,
  };
}

export function formatMs(value: number): string {
  return value.toFixed(3);
}
