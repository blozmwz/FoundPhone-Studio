import type { Runtime, Work } from "../schema";

// Revision16 was an unpublished author draft. Keep opening choices, personal
// records and timers outside this edited stage; bridge only its active anchors.
export function migrateStage3(work: Work, saved: Runtime): Runtime {
  if (
    work.variables.s3Revision !== 1 ||
    work.variables.saveFamily !== "thursday-author" ||
    saved.variables.s3Revision === 1
  )
    return saved;
  const state = structuredClone(saved);
  const date = state.date || work.phone.date || "2026-09-17";
  const pending = String(state.variables.pendingScene || "");
  const oldPending: Record<string, string> = {
    "life-film1-morning":
      date < "2026-12-01" ? "s3-dec04" : "life-film1-morning",
    "rev15-savedseat": date < "2026-12-13" ? "s3-dec13" : "rev15-savedseat",
    "life-film2-morning":
      date < "2027-01-01" ? "s3-dec22" : "life-film2-morning",
    "life-kitchen": "s3-jan11",
    "rev15-yuki-winter": date < "2027-01-17" ? "s3-jan17" : "rev15-yuki-winter",
  };
  if (oldPending[pending]) state.variables.pendingScene = oldPending[pending];

  // A saved question is still a question. Wording-only surviving IDs keep the
  // existing draft. The deleted second-shoulder SMS becomes a dated record.
  if (
    state.choices.some((choice) =>
      choice.target.startsWith("life-film2-sleep-"),
    ) ||
    state.scheduled?.some((job) =>
      /^deliver-life-film2-(morning|sleep)-/.test(job.nodeId),
    )
  ) {
    state.choices = [];
    state.scheduled = [];
    state.variables.pendingScene = state.completed.includes(
      "life-film2-morning",
    )
      ? "s3-jan09-record"
      : "life-film2-morning";
    const draft = state.ui?.messages?.replyDraft;
    if (typeof draft === "string" && draft.startsWith("life-film2-sleep-")) {
      state.ui = {
        ...state.ui,
        messages: {
          ...state.ui?.messages,
          previousStage3Draft: draft,
          replyDraft: "",
        },
      };
    }
  }
  // Retired final bubbles cannot run as inert compatibility nodes: reconnect
  // their unanswered next round, never resend an already committed choice.
  const retiredJobs = (state.scheduled || []).filter((job) => {
    const node = work.nodes.find((candidate) => candidate.id === job.nodeId);
    return node?.conditions.some(
      (condition) => condition.key === "s3LegacyPlayback",
    );
  });
  if (retiredJobs.length) {
    const ids = retiredJobs.map((job) => job.nodeId).join(" ");
    state.scheduled = (state.scheduled || []).filter(
      (job) => !retiredJobs.includes(job),
    );
    const target = ids.includes("life-film1-morning")
      ? "life-film1-sleep"
      : ids.includes("life-film1-sleep")
        ? "s3-shoulder-detail"
        : ids.includes("life-ddl-in")
          ? "life-ddl-reply"
          : "";
    if (target && !state.choices.length && !state.scheduled.length) {
      const next = work.nodes.find((node) => node.id === target)!;
      state.choices = next.next.map((id) => ({
        target: id,
        label: work.nodes.find((node) => node.id === id)?.label || "",
      }));
    } else if (
      !state.choices.length &&
      !state.scheduled.length &&
      ids.includes("life-coffee")
    )
      state.variables.pendingScene = "s3-jan17";
  }
  // The old optional avatar story and the dated January11 scene share progress.
  const done = (prefix: string) =>
    state.completed.some((id) => id.startsWith(prefix));
  state.variables.s3DogRound = state.variables.dogStoryHeard
    ? 5
    : done("life-dog-close-")
      ? 4
      : done("life-topic-dog-end-")
        ? 2
        : done("life-topic-dog-read")
          ? 1
          : 0;
  state.scheduled = (state.scheduled || []).map((job) => ({
    ...job,
    nodeId: job.nodeId.replace(
      /^deliver-life-topic-dog-reply-/,
      "deliver-s3-dog-first-send-1-reply-",
    ),
  }));
  if (
    state.variables.sideBusy &&
    state.variables.sideContext === "life-topic-dog" &&
    !state.choices.length &&
    !state.scheduled.length
  ) {
    const round = Number(state.variables.s3DogRound || 0);
    const node = [
      "s3-dog-first",
      "life-topic-dog-follow",
      "life-dog-now",
      "s3-dog-later",
      "life-dog-close",
    ][round];
    if (node)
      state.choices = [1, 2].map((n) => ({
        target: `${node}-send-${n}`,
        label:
          work.nodes.find((candidate) => candidate.id === `${node}-send-${n}`)
            ?.label || "",
      }));
    else state.variables.sideBusy = false;
  }
  // Kitchen/coffee now share January15. Do not move completed later saves back.
  const active =
    state.choices.map((c) => c.target).join(" ") +
    " " +
    state.scheduled.map((job) => job.nodeId).join(" ");
  if (date < "2027-01-15" && /life-(kitchen|coffee)/.test(active))
    state.date = "2027-01-15";
  state.variables.s3Revision = 1;
  return state;
}
