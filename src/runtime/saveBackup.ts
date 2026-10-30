import { z } from "zod";
import type { Runtime, Work } from "../schema";
import { restoreRuntime, savedRuntimeSchema } from "./saveMigration";
export const MAX_SAVE_BYTES = 24 * 1024 * 1024;
const backupSchema = z.object({
  format: z.literal("thursday-save"),
  version: z.literal(1),
  exportedAt: z.string(),
  playerName: z.string().trim().min(1).max(24),
  state: savedRuntimeSchema,
});
export function encodeBackup(state: Runtime, playerName: string) {
  return JSON.stringify(
    {
      format: "thursday-save",
      version: 1,
      exportedAt: new Date().toISOString(),
      playerName,
      state,
    },
    null,
    2,
  );
}
export function decodeBackup(work: Work, text: string) {
  if (new TextEncoder().encode(text).length > MAX_SAVE_BYTES)
    throw Error("存档文件过大，未覆盖进度。");
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw Error("这不是有效的JSON存档文件，未覆盖进度。");
  }
  const result = backupSchema.safeParse(value);
  if (!result.success) throw Error("存档格式不完整或不受支持，未覆盖进度。");
  return { ...result.data, state: restoreRuntime(work, result.data.state) };
}
export function downloadBackup(text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download =
    "礼拜四-存档-" + new Date().toISOString().slice(0, 10) + ".json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
