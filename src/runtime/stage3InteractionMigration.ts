import type { Runtime, Work } from "../schema";
import { dispatch } from "../engine";

const retired = (id: string) =>
  /^(life-topic-small|rev15-yuki-winter)/.test(
    id.replace(/^deliver-/, "").replace(/^topic:/, ""),
  );

export function migrateStage3Interactions(work: Work, saved: Runtime): Runtime {
  if (
    work.variables.saveFamily !== "thursday-author" ||
    work.variables.s3InteractionRevision !== 1 ||
    saved.variables.s3InteractionRevision === 1
  )
    return saved;
  let state = structuredClone(saved);
  state.scheduled ??= [];
  state.ui ??= {};
  const oldYuki =
    state.variables.pendingScene === "rev15-yuki-winter" ||
    ((state.date || "") <= "2027-01-31" &&
      state.completed.some((id) =>
        /^rev15-yuki-winter-reply-send-[12]-finish$/.test(id),
      )) ||
    [
      ...state.choices.map((c) => c.target),
      ...state.scheduled.map((j) => j.nodeId),
      String(state.variables.s3Awaiting || ""),
    ].some((id) => id.replace(/^deliver-/, "").startsWith("rev15-yuki-winter"));
  const oldSmall =
    state.variables.sideContext === "life-topic-small" &&
    (state.variables.sideBusy || state.choices.some((c) => retired(c.target)));
  state.choices = state.choices.filter((c) => !retired(c.target));
  state.scheduled = (state.scheduled || []).filter((j) => !retired(j.nodeId));
  if (retired(String(state.variables.s3Awaiting || "")))
    state.variables.s3Awaiting = "";
  if (oldSmall) {
    state.variables.sideBusy = false;
    state.variables.sideContext = "";
  }
  const ui = state.ui.messages;
  if (ui?.replyDraft && retired(String(ui.replyDraft))) {
    ui.previousStage3InteractionDraft = ui.replyDraft;
    ui.replyDraft = "";
  }
  if (state.variables.filmPlan === "comrades") {
    state.variables.s3RetiredFilmPlan = "comrades";
    state.variables.filmPlan = "";
  }
  // Keep all genuine viewing state and old choice/read history. Expired Stories
  // do not become highlights and removing a chat never rewinds its old date.
  const ig = state.ui.instagram;
  if (ig) {
    if (ig.igSelectedPost === "s3-ig-owner-ride") ig.igSelectedPost = "";
    if (
      ig.igReplyContext === "s3-ig-owner-ride" ||
      ig.igReplyContext === "s3-owner-night-ride"
    ) {
      if (ig.igReplyDraft) ig.previousStage3IGDraft = ig.igReplyDraft;
      ig.igReplyDraft = "";
      ig.igReplyContext = "";
    }
    if (Array.isArray(ig.mymyReplies)) {
      const oldReplies = ig.mymyReplies.filter((s) =>
        s.startsWith("s3-ig-owner-ride\t"),
      );
      if (oldReplies.length) ig.previousStage3IGReplies = oldReplies;
      ig.mymyReplies = ig.mymyReplies.filter(
        (s) => !s.startsWith("s3-ig-owner-ride\t"),
      );
    }
  }
  state.notifications = state.notifications.map((text) =>
    text.replace("赞了你的照片：出去兜了一圈", "赞了你的快拍：出去兜了一圈"),
  );
  const unlock = (id: string) => {
    if (!state.unlocked.includes(id)) state.unlocked.push(id);
  };
  if (
    state.variables.s3MotorRide === true &&
    state.variables.s3MotorRideDone === true
  )
    unlock("s3-ig-mina-ride-dm");
  if (oldYuki) {
    state.variables.sideBusy = false;
    if ((state.date || "") < "2027-01-19")
      state.variables.pendingScene = "s3-jan19-friends";
    else {
      unlock("ig-photo-friends");
      unlock("s3-ig-friends-mirror");
      state.variables.pendingScene = "";
      state.variables.s3ReviewComplete = true;
      state.variables.s3PreviewPaused = true;
    }
  }
  if (
    (state.date || "") >= "2027-01-19" &&
    `${state.date} ${state.time}` >= "2027-01-19 22:00" &&
    Number(state.variables.lifeStage) >= 3
  )
    unlock("s3-ig-friends-mirror");
  // A message already delivered at the old last bubble needs its new tail;
  // a completed reply/choice must not be re-opened just to replay new wording.
  for (const [oldLast, newLast, readNode] of [
    [
      "s3-shoulder-detail-send-1-reply-2",
      "s3-shoulder-detail-send-1-reply-3",
      "s3-shoulder-detail-send-1-finish",
    ],
    ["life-ddl-in-2", "life-ddl-in-3", "read-life-ddl-in-2"],
    [
      "s3-dec13-wake-send-1-reply-2",
      "s3-dec13-wake-send-1-reply-3",
      "s3-dec13-wake-send-1-finish",
    ],
    ["s3-dec30-in-3", "s3-dec30-in-4", "read-s3-dec30-in-3"],
    ["s3-coffee-direct-in-2", "s3-coffee-direct-in-3", "s3-coffee-direct-read"],
    [
      "life-coffee-reply-send-2-reply-1",
      "life-coffee-reply-send-2-reply-2",
      "life-coffee-reply-send-2-finish",
    ],
  ]) {
    const delivery = "deliver-" + newLast;
    if (
      state.variables.s3Awaiting === oldLast &&
      state.unlocked.includes(oldLast) &&
      !state.unlocked.includes(newLast) &&
      !state.completed.includes(readNode) &&
      !state.scheduled.some((j) => j.nodeId === delivery) &&
      !state.choices.length
    )
      state.scheduled.push({
        nodeId: delivery,
        due:
          (state.elapsedMs || 0) +
          (work.nodes.find((n) => n.id === delivery)?.delayMs || 2000),
      });
  }
  if (
    state.variables.s3MotorRide === true &&
    state.variables.s3MotorRideDone === true &&
    !state.variables.s3YukiRideStarted &&
    state.variables.pendingScene === "s3-dec30" &&
    state.date === "2026-12-27" &&
    !state.choices.length &&
    !state.scheduled.length &&
    !state.variables.sideBusy
  )
    state = dispatch(work, state, "stage3RideYuki", "s3-yuki-ride-start");
  state.variables.s3InteractionRevision = 1;
  return state;
}
