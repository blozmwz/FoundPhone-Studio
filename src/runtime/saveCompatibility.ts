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
export function saveAnchorIssues(work: Work, state: Runtime) {
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
  return {
    choices: state.choices
      .filter((c) => !nodes.has(c.target))
      .map((c) => c.target),
    scheduled: (state.scheduled || [])
      .filter((j) => !nodes.has(j.nodeId))
      .map((j) => j.nodeId),
    pending: pending && !nodes.has(pending) ? [pending] : [],
    read: state.read.filter((id) => !records.has(id)),
    unlocked: state.unlocked.filter((id) => !records.has(id)),
  };
}
export class SaveAnchorError extends Error {
  readonly code = "SAVE_ANCHOR_MIGRATION_REQUIRED";
  constructor(readonly details: ReturnType<typeof saveAnchorIssues>) {
    super("这次剧情结构变化需要迁移，原存档已保留，未重新开始。");
    this.name = "SaveAnchorError";
  }
}
export function validateSaveAnchors(work: Work, state: Runtime) {
  const issues = saveAnchorIssues(work, state);
  if (Object.values(issues).some((ids) => ids.length))
    throw new SaveAnchorError(issues);
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
