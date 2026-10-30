import type { Runtime, Work } from "../schema";

function family(variables: Work["variables"]) {
  return (
    variables.saveFamily ||
    (variables.publicDemo === true || variables.releaseStage2 === true
      ? "thursday-public"
      : "thursday-author")
  );
}
export function compatibleSaveRevision(work: Work, saved: Runtime) {
  if (saved.revision === work.updatedAt) return true;
  const min = Number(work.variables.saveCompatibleFrom);
  return (
    work.id === "fridge-light-roommates" &&
    family(work.variables) === family(saved.variables) &&
    Number.isInteger(min) &&
    min > 0 &&
    saved.revision >= min &&
    saved.revision < work.updatedAt
  );
}
// Compatibility is an author declaration, checked against the saved active
// anchors. A structural change still needs an explicit migration, never a reset.
export function validateSaveAnchors(work: Work, state: Runtime) {
  const nodes = new Set(work.nodes.map((node) => node.id));
  const records = new Set([
    ...Object.values(work.data)
      .flat()
      .map((item) => item.id),
    ...Object.values(state.messages)
      .flat()
      .map((item) => item.id),
  ]);
  const pending = String(state.variables.pendingScene || "");
  if (
    state.choices.some((choice) => !nodes.has(choice.target)) ||
    state.scheduled?.some((job) => !nodes.has(job.nodeId)) ||
    (pending && !nodes.has(pending)) ||
    [...state.read, ...state.unlocked].some((id) => !records.has(id))
  )
    throw Error("这次剧情结构变化需要迁移，原存档已保留，未重新开始。");
}
export function resumeExtendedRelease(work: Work, state: Runtime) {
  const next = work.variables.resumeAfterRelease;
  if (
    !state.variables.releaseComplete ||
    state.endings.length ||
    state.choices.length ||
    state.scheduled?.length ||
    state.variables.sideBusy ||
    typeof next !== "string" ||
    !next
  )
    return;
  const node = work.nodes.find(
    (node) => node.id === next && node.event === "continueScene",
  );
  if (!node) throw Error("新增阶段的接续入口不完整，原存档已保留。");
  // Reopening an already entered phase must not send its opening a second time.
  if (state.completed.includes(next)) return;
  state.variables.releaseComplete = false;
  state.variables.pendingScene = next;
}
