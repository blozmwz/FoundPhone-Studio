import type { Runtime, Work } from "../schema";
// Optional authored post metadata captures its first unlock, without changing
// the game clock. Historical backfill uses authored dates, never today's date.
export function stampUnlockedPost(
  work: Work,
  state: Runtime,
  id: string,
  historical = false,
) {
  const item = work.data.threads?.find(
    (i) => i.id === id && i.meta.captureUnlockTime === "true",
  );
  if (!item) return;
  const dateKey = item.meta.dateVariable,
    timeKey = item.meta.timeVariable;
  if (!dateKey || !timeKey || state.variables[dateKey]) return;
  const originalDate = String(
    state.variables[item.meta.baseDateVariable] || item.time.slice(0, 10),
  );
  const date = historical
    ? originalDate
    : state.date || work.phone.date || originalDate;
  let time = historical ? item.time.slice(11, 16) : state.time;
  if (date === state.date && time > state.time) time = state.time;
  state.variables[dateKey] = date;
  state.variables[timeKey] = time;
}
export function backfillApprovedPosts(work: Work, state: Runtime) {
  for (const item of work.data.threads || []) {
    if (item.meta.captureUnlockTime !== "true") continue;
    const nodes = (item.meta.unlockAfter || "").split(",");
    if (!nodes.some((id) => state.completed.includes(id))) continue;
    if (!state.unlocked.includes(item.id)) state.unlocked.push(item.id);
    stampUnlockedPost(work, state, item.id, true);
  }
  return state;
}
