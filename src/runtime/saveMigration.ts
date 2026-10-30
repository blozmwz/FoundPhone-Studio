import { reconcileReadNotices } from "./messageRead";
import { reconcileAsideTimestamps } from "./asideTimestamps";
import { backfillApprovedPosts } from "../story-engine/recordTimestamp";
import { z } from "zod";
import { itemSchema, initialRuntime, type Runtime, type Work } from "../schema";
import { dispatch } from "../engine";
import { migrateStage2Trim } from "./stage2SaveTrim";
const scalar = z.union([z.string(), z.number().finite(), z.boolean()]);
const strings = z.array(z.string().max(10000)).max(50000);
const uiValue = z.union([scalar, strings]);
export const savedRuntimeSchema = z.object({
  workId: z.string(),
  revision: z.number().int(),
  variables: z.record(z.string(), scalar),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  visited: strings,
  read: strings,
  clues: strings,
  unlocked: strings,
  hidden: strings,
  completed: strings,
  notifications: strings,
  endings: strings,
  trace: strings,
  choices: z.array(z.object({ label: z.string(), target: z.string() })),
  messages: z.record(z.string(), z.array(itemSchema)),
  elapsedMs: z.number().finite().nonnegative().default(0),
  clockRemainderMs: z.number().finite().nonnegative().default(0),
  scheduled: z
    .array(
      z.object({ nodeId: z.string(), due: z.number().finite().nonnegative() }),
    )
    .default([]),
  ui: z.record(z.string(), z.record(z.string(), uiValue)).default({}),
  incomingCall: z
    .object({
      caller: z.string(),
      target: z.string(),
      status: z.enum(["ringing", "answered"]),
    })
    .nullable()
    .default(null),
});
export function restoreRuntime(work: Work, input: unknown): Runtime {
  const parsed = savedRuntimeSchema.safeParse(input);
  if (!parsed.success)
    throw Error("存档格式不完整，原存档已保留，请先导出备份。");
  const saved = parsed.data;
  if (saved.workId !== work.id)
    throw Error("这份存档属于另一部作品，未覆盖进度。");
  const publicUpgrade =
    work.variables.releaseStage2 === true && saved.revision === 1501;
  if (saved.revision !== work.updatedAt && !publicUpgrade)
    throw Error("这份存档版本暂不兼容，原存档已保留，请先导出备份。");
  let state: Runtime = {
    ...initialRuntime(work),
    ...saved,
    variables: { ...saved.variables },
    revision: work.updatedAt,
  };
  if (publicUpgrade) {
    // Only the old demo stop is retired; a genuine rejection stays an ending.
    state.endings = state.endings.filter(
      (e) => !e.startsWith("前两章试玩结束｜"),
    );
    state.completed = state.completed.filter(
      (id) => !id.startsWith("public-demo-ending-"),
    );
    delete state.variables.demoComplete;
    if (
      saved.variables.demoComplete === true ||
      saved.endings.some((e) => e.startsWith("前两章试玩结束｜"))
    ) {
      state.variables.openingPaused = false;
      state.variables.pendingScene = "scene-viewing-contract";
    }
    state.variables.publicSaveMigrated = 1501;
  }
  if (work.variables.releaseStage2 === true) {
    const hadStop = state.endings.some((e) =>
      e.startsWith("Stage 2 试玩结束｜"),
    );
    state.endings = state.endings.filter(
      (e) => !e.startsWith("Stage 2 试玩结束｜"),
    );
    if (hadStop || state.variables.releaseComplete === true) {
      state.variables.releaseComplete = true;
      state.variables.pendingScene = "";
    }
  }
  state = migrateStage2Trim(work, state);
  // Stable choice IDs keep unsent drafts valid across a wording-only update.
  state.choices = state.choices.map((choice) => ({
    ...choice,
    label:
      work.nodes.find((node) => node.id === choice.target)?.label ??
      choice.label,
  }));
  state.variables = { ...work.variables, ...state.variables };
  return reconcileReadNotices(
    work,
    backfillApprovedPosts(work, reconcileAsideTimestamps(work, state)),
  );
}
export function startFresh(work: Work) {
  return dispatch(work, initialRuntime(work), "start");
}
