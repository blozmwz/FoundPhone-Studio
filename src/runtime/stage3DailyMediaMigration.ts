import type { Runtime, Work } from "../schema";

// Additive, author-only migration. New Story days never replay old conversations
// or move a returning player backwards. Already-past Stories keep their original
// game timestamp, so the normal 24-hour visibility rule still applies.
export function migrateStage3DailyMedia(work: Work, saved: Runtime): Runtime {
  if (
    work.variables.saveFamily !== "thursday-author" ||
    work.variables.s3DailyMediaRevision !== 1 ||
    saved.variables.s3DailyMediaRevision === 1
  )
    return saved;
  const state = structuredClone(saved);
  const now = `${state.date || ""} ${state.time}`;
  for (const [scene, previousNext, itemId] of [
    ["s3-dec10", "s3-dec13", "s3-ig-daily-game"],
    ["s3-dec20", "s3-dec22", "s3-ig-daily-friends"],
    ["s3-jan03", "s3-jan05", "s3-ig-daily-meal"],
    ["s3-jan12", "life-kitchen", "s3-ig-daily-route"],
  ]) {
    const item = work.data.instagram?.find((i) => i.id === itemId);
    if (!item) continue;
    if (
      Number(state.variables.lifeStage) >= 3 &&
      !state.endings.length &&
      now >= item.time &&
      !state.unlocked.includes(itemId)
    )
      state.unlocked.push(itemId);
    if (
      state.variables.pendingScene === previousNext &&
      now < item.time &&
      !state.completed.includes(scene)
    )
      state.variables.pendingScene = scene;
  }
  state.variables.s3DailyMediaRevision = 1;
  return state;
}
