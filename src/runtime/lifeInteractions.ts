import { catalogueInteraction } from "./filmCatalogue";
import { dispatch, visible } from "../engine";
import { nextAsideTimestamp } from "./asideTimestamps";
import type { Runtime, Work } from "../schema";

export function canChatAside(state: Runtime) {
  return (
    (Boolean(state.variables.pendingScene) ||
      state.variables.releaseComplete === true ||
      state.variables.s3PreviewPaused === true ||
      state.variables.s3LunchOrdering === true) &&
    !state.endings.length &&
    !state.choices.length &&
    !state.scheduled?.length &&
    !state.variables.sideBusy
  );
}
export function canOrderFood(state: Runtime) {
  const stage = Number(state.variables.lifeStage || 0);
  const confirmed =
    state.variables.housingRoute === "stay" &&
    [1, 2].some((option) =>
      state.completed.includes(`viewing-rent-send-${option}-continue`),
    );
  return confirmed && stage > 0 && stage < 5 && canChatAside(state);
}
export function availableTopics(work: Work, state: Runtime) {
  if (!canChatAside(state) || state.variables.s3LunchOrdering) return [];
  const stage = Number(state.variables.lifeStage || 0);
  return (work.data.messages ?? []).filter(
    (m) =>
      m.meta.topic === "true" &&
      m.meta.retired !== "true" &&
      !state.variables["topicUsed-" + m.id] &&
      (!m.meta.requiresRead || state.read.includes(m.meta.requiresRead)) &&
      (!m.meta.requiresAnyRead ||
        m.meta.requiresAnyRead
          .split(",")
          .some((id) => state.read.includes(id))) &&
      stage >= Number(m.meta.minStage) &&
      stage <= Number(m.meta.maxStage) &&
      (m.meta.avatar !== "true" || state.variables.avatarViewed === true) &&
      !state.completed.includes(m.id + "-start"),
  );
}
export function topicReplies(work: Work, state: Runtime, topicId: string) {
  const topic = availableTopics(work, state).find((m) => m.id === topicId);
  if (!topic) return [];
  const alternate = work.data.messages.find(
    (m) => m.id === topic.meta.alternateReplyId,
  );
  return alternate ? [topic, alternate] : [];
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
  if (event === "draftFilmInvite") return state;
  if (event === "watchFilm" && !canChatAside(state)) return state;
  const catalogue = catalogueInteraction(work, state, event, target);
  if (catalogue) return catalogue;
  if (event === "filmStatus" || event === "planFilm") {
    if (state.endings.length) return state;
    const next = dispatch(work, state, event, target);
    if (event === "filmStatus") {
      const match = /^(spring|chungking)-(finished|unfinished)$/.exec(target);
      if (
        match &&
        next.variables["filmReportReady-" + match[1]] === true &&
        next.variables["filmStatus-" + match[1]] === match[2]
      ) {
        const session = ["dec04", "dec22", "jan08"]
          .filter((key) => next.variables["s3Film-" + key] === match[1])
          .at(-1);
        if (session) next.variables["s3FilmState-" + session] = match[2];
      }
    }
    return next;
  }
  if (!canChatAside(state)) return state;
  if (event === "orderFood" && !canOrderFood(state)) return state;
  // This is the menu the player explicitly proposed sharing at lunch. Its
  // actual order produces one acknowledgement, not a second optional food plot.
  if (event === "orderFood" && state.variables.s3LunchOrdering === true) {
    if (!work.data.delivery?.some((item) => item.meta.food === target))
      return state;
    const next = dispatch(work, state, "stage3LunchOrder", target);
    const stamp = nextAsideTimestamp(work, state);
    next.variables["sideDate-s3-lunch"] = stamp.date;
    next.variables["sideTime-s3-lunch"] = stamp.time;
    return next;
  }
  if (
    event === "topic" &&
    !availableTopics(work, state).some((m) =>
      topicReplies(work, state, m.id).some((reply) => reply.id === target),
    )
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
    const stamp = nextAsideTimestamp(work, state);
    next.variables["sideDate-" + context] = stamp.date;
    next.variables["sideTime-" + context] = stamp.time;
  }
  return next;
}
