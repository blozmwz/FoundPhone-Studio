import type { Runtime, Work } from "../schema";

// Narrow content migration: retain progress, but remove choices/timers belonging
// to the deleted November3 ordering and November4 chat. No other save is reset.
export function retiredStage2Id(id: string) {
  return (
    id.replace(/^deliver-/, "").startsWith("rev15-yuki-busy") ||
    /^(deliver-)?s2-(yuki-busy-|busy-|order-busy-)/.test(id)
  );
}
export function migrateStage2Trim(work: Work, saved: Runtime): Runtime {
  if (
    work.id !== "fridge-light-roommates" ||
    work.variables.stage2TrimRevision !== 1 ||
    saved.variables.stage2TrimRevision === 1
  )
    return saved;
  const state = structuredClone(saved);
  const affected =
    state.choices.some((c) => retiredStage2Id(c.target)) ||
    state.scheduled?.some((t) => retiredStage2Id(t.nodeId)) ||
    retiredStage2Id(String(state.variables.pendingScene ?? ""));
  state.choices = state.choices
    .filter((c) => !retiredStage2Id(c.target))
    .map((c) => ({
      ...c,
      label: work.nodes.find((node) => node.id === c.target)?.label ?? c.label,
    }));
  state.scheduled = (state.scheduled ?? []).filter(
    (t) => !retiredStage2Id(t.nodeId),
  );
  state.unlocked = state.unlocked.filter((id) => !retiredStage2Id(id));
  state.read = state.read.filter((id) => !retiredStage2Id(id));
  state.completed = state.completed.filter((id) => !retiredStage2Id(id));
  if (affected) {
    state.variables.pendingScene =
      (state.date ?? "") >= "2026-11-20"
        ? "life-film1-morning"
        : (state.date ?? "") >= "2026-11-18"
          ? "life-film2"
          : "rev15-yuki-shoulder";
  }
  const draft = String(state.ui?.messages?.replyDraft ?? "");
  if (retiredStage2Id(draft) && state.ui?.messages)
    state.ui.messages.replyDraft = "";
  delete state.variables.s2BusyFood;
  delete state.variables.s2BusyOrdered;
  state.variables.stage2TrimRevision = 1;
  return state;
}
