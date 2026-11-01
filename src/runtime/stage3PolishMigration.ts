import type { Runtime, Work } from "../schema";
const deletedPrefixes = [
  "s3-noodles-follow",
  "s3-dec13-plan",
  "s3-dec13-return",
  "s3-lunch-order",
  "rev15-savedseat-reply",
  "rev15-savedseat-in",
  "rev15-savedseat-read",
  "rev15-topic-seat",
  "s3-coffee-outing",
  "s3-coffee-left",
];
export const retiredStage3PolishId = (id: string) =>
  /^(life-coffee-reply-send-1-reply-2|s3-dec13-wake-send-1-reply-3)$/.test(
    id.replace(/^deliver-/, ""),
  ) || deletedPrefixes.some((p) => id.replace(/^deliver-/, "").startsWith(p));
export function migrateStage3Polish(work: Work, saved: Runtime): Runtime {
  if (
    work.variables.saveFamily !== "thursday-author" ||
    work.variables.s3PolishRevision !== 1 ||
    saved.variables.s3PolishRevision === 1
  )
    return saved;
  const state = structuredClone(saved);
  const anchors = [
    ...state.choices.map((c) => c.target),
    ...(state.scheduled || []).map((j) => j.nodeId),
    String(state.variables.s3Awaiting || ""),
  ];
  const affected = anchors.some(retiredStage3PolishId);
  if (affected) {
    const ids = anchors.join(" ");
    state.choices = state.choices.filter(
      (c) => !retiredStage3PolishId(c.target),
    );
    state.scheduled = (state.scheduled || []).filter(
      (j) => !retiredStage3PolishId(j.nodeId),
    );
    state.variables.s3Awaiting = "";
    state.variables.s3LunchOrdering = false;
    state.variables.sideBusy = false;
    state.variables.pendingScene = /coffee/.test(ids)
      ? "s3-jan17"
      : /topic-seat/.test(ids)
        ? String(saved.variables.pendingScene || "")
        : /savedseat/.test(ids)
          ? !state.unlocked.includes("s3-post-legs") &&
            state.date === "2026-12-18" &&
            state.time < "23:20"
            ? "s3-dec18-after"
            : "s3-dec22"
          : /noodles/.test(ids)
            ? "s3-dec13"
            : "s3-dec16";
    if (/noodles/.test(ids))
      for (const id of ["life-ddl-list", "life-post-ddl"])
        if (!state.unlocked.includes(id)) state.unlocked.push(id);
    if (
      /savedseat/.test(ids) &&
      state.variables.pendingScene !== "s3-dec18-after" &&
      !state.unlocked.includes("s3-post-legs")
    )
      state.unlocked.push("s3-post-legs");
  }
  const draft = String(state.ui?.messages?.replyDraft || "");
  if (retiredStage3PolishId(draft) && state.ui?.messages) {
    state.ui.messages.previousStage3PolishDraft = draft;
    state.ui.messages.replyDraft = "";
  }
  // Canonical optional-topic completion is shared by its A/B entry points.
  for (const topic of [
    "life-topic-movie",
    "life-topic-food",
    "life-topic-small",
    "rev15-topic-computer",
  ])
    if (
      state.completed.some(
        (id) => id === topic + "-start" || id === topic + "-alternate-start",
      )
    )
      state.variables["topicUsed-" + topic] = true;
  state.notifications = state.notifications.map((n) =>
    n.replace("赞了你的快拍：出去兜了一圈", "赞了你的照片：出去兜了一圈"),
  );
  for (const [flag, ids] of [
    ["s3MotorRideDone", ["s3-ig-profile-mina-days"]],
    [
      "s3RamenMealDone",
      [
        "s3-ig-profile-bigfoot",
        "s3-ig-profile-mai",
        "s3-ig-profile-lippy",
        "s3-ig-profile-swan",
      ],
    ],
  ] as const)
    if (state.variables[flag])
      for (const id of ids)
        if (!state.unlocked.includes(id)) state.unlocked.push(id);
  if (state.date && state.date >= "2026-12-04")
    for (const i of work.data.netflix || [])
      if (i.id.startsWith("s3-film-") && !state.unlocked.includes(i.id))
        state.unlocked.push(i.id);
  state.variables.s3PolishRevision = 1;
  return state;
}
