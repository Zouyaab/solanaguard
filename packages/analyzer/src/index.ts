export { TransactionNotFoundError } from "./errors.js";
export {
  decodeCompiledInstruction,
  decodeInstructions,
  decodeSummaryNotes,
} from "./decode/apply.js";
export { defaultDecoderPlugins, mergeDecoderPlugins } from "./decode/defaults.js";
export type { DecodedInstructionView, InstructionDecoderPlugin } from "./decode/plugin.js";
export {
  CURVE_CLASSIFICATION_NOTE,
  SIGNER_OFF_CURVE_NOTE,
  classifyAddress,
  classifyAccountKey,
} from "./classify.js";
export {
  ACCOUNT_RESOLUTION_SKIPPED_NOTE,
  LOOKUP_TABLES_UNREADABLE_NOTE,
  attachResolvedAccounts,
  resolveLookupAddresses,
} from "./resolve.js";
export {
  LOOKUPS_UNRESOLVED_NOTE,
  normalizeLocalTransaction,
  normalizeTransaction,
  transactionBytesFromInput,
} from "./normalize.js";
export type { LocalTransactionInput, NormalizeOptions, TransactionInput } from "./normalize.js";
export { SIMULATION_NOTE, simulateNormalizedTransaction } from "./simulate.js";
export type { SimulateOptions, SimulatedTransactionView } from "./simulate.js";
export {
  BEHAVIOR_COMPARISON_NOTE,
  compareExpectedToSimulated,
  compareNormalizedTransaction,
  deriveExpectedEffects,
} from "./compare.js";
export type { ComparedTransactionView } from "./compare.js";
