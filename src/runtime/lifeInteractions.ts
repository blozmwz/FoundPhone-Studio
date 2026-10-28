import { dispatch, visible } from "../engine";
import type { Runtime, Work } from "../schema";

export function canChatAside(state: Runtime) {
  return (
    Boolean(state.variables.pendingScene) &&
    !state.endings.length &&
    !state.choices.length &&
    !state.scheduled?.length &&
    !state.variables.sideBusy
  );
}
export function availableTopics(work: Work, state: Runtime) {
  if (!canChatAside(state)) return [];
  const stage = Number(state.variables.lifeStage || 0);
  return (work.data.messages ?? []).filter(
    (m) =>
      m.meta.topic === "true" &&
      (!m.meta.requiresRead || state.read.includes(m.meta.requiresRead)) &&
      stage >= Number(m.meta.minStage) &&
      stage <= Number(m.meta.maxStage) &&
      (m.meta.avatar !== "true" || state.variables.avatarViewed === true) &&
      !state.completed.includes(m.id + "-start"),
  );
}
export function lifeInteraction(
  work: Work,
  state: Runtime,
  event: string,
  target: string,
) {
  if (work.id !== "fridge-light-roommates") return state;
  if (event === "reunion") {
    if (state.variables.lifeEnding !== "quiet") return state;
    const next = dispatch(work, state, event, target);
    next.ui = {
      ...next.ui,
      messages: { ...next.ui?.messages, reunionOpen: true },
    };
    return next;
  }
  if (event === "avatarViewed") return dispatch(work, state, event, target);
  if (event === "filmStatus" || event === "planFilm") {
    if (state.endings.length) return state;
    return dispatch(work, state, event, target);
  }
  if (!canChatAside(state)) return state;
  if (
    event === "topic" &&
    !availableTopics(work, state).some((m) => m.id === target)
  )
    return state;
  if (event === "reactMessage") {
    const item = work.data.messages.find((m) => m.id === target);
    if (!item || !visible(item, state) || item.outgoing) return state;
  }
  if (!["topic", "orderFood", "reactMessage"].includes(event)) return state;
  const next = dispatch(work, state, event, target);
  const context = next.variables.sideContext;
  if (
    typeof context === "string" &&
    next.completed.length !== state.completed.length
  ) {
    next.variables["sideDate-" + context] =
      state.date || work.phone.date || "2026-09-17";
    next.variables["sideTime-" + context] = state.time;
  }
  return next;
}
