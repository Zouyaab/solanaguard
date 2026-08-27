import type { InstructionDecoderPlugin } from "./plugin.js";

/** SPL Memo v1 and v2. */
export const MEMO_PROGRAM_V1 = "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo";
export const MEMO_PROGRAM_V2 = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

function decodeMemo({ data }: { data: Uint8Array }) {
  const messageUtf8 = Buffer.from(data).toString("utf8");
  const validUtf8 = Buffer.from(messageUtf8, "utf8").equals(Buffer.from(data));
  return {
    instructionType: "Memo",
    namedAccounts: [],
    args: validUtf8
      ? { message: messageUtf8 }
      : { messageBase64: Buffer.from(data).toString("base64") },
  };
}

export const memoV1Decoder: InstructionDecoderPlugin = {
  programId: MEMO_PROGRAM_V1,
  programName: "spl_memo",
  decode: decodeMemo,
};

export const memoV2Decoder: InstructionDecoderPlugin = {
  programId: MEMO_PROGRAM_V2,
  programName: "spl_memo",
  decode: decodeMemo,
};
