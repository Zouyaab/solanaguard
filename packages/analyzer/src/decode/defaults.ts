import { computeBudgetDecoder } from "./compute-budget.js";
import { memoV1Decoder, memoV2Decoder } from "./memo.js";
import type { InstructionDecoderPlugin } from "./plugin.js";
import { splToken2022Decoder, splTokenDecoder } from "./token.js";
import { systemProgramDecoder } from "./system.js";

export const defaultDecoderPlugins: readonly InstructionDecoderPlugin[] = [
  systemProgramDecoder,
  computeBudgetDecoder,
  memoV1Decoder,
  memoV2Decoder,
  splTokenDecoder,
  splToken2022Decoder,
];

export function mergeDecoderPlugins(
  extra: readonly InstructionDecoderPlugin[] = [],
): InstructionDecoderPlugin[] {
  const map = new Map<string, InstructionDecoderPlugin>();
  for (const plugin of defaultDecoderPlugins) {
    map.set(plugin.programId, plugin);
  }
  for (const plugin of extra) {
    map.set(plugin.programId, plugin);
  }
  return [...map.values()];
}
