import type { Runtime, Work } from "../schema";

// Published chat headers used onRead(thread), although a thread title is not a
// story record. Archive just these two known UI markers; never waive unknown IDs.
export const legacyConversationMarkers = ["Hendery", "Yuki"] as const;
const retiredOptional = (id: string) =>
  /^(life-topic-(movie|food|small))(-|$)/.test(
    id.replace(/^(deliver-|read-|topic:)/, ""),
  );
export const publishedAnchorMappings = {
  "public-demo-ending-1": "scene-viewing-contract",
  "public-demo-ending-2": "scene-viewing-contract",
  "life-topic-movie:*": "preserve-pending-main-scene",
  "life-topic-food:*": "preserve-pending-main-scene",
  "life-topic-small:*": "preserve-pending-main-scene",
} as const;
export function repairLegacySaveAnchors(work: Work, input: Runtime): Runtime {
  if (work.id !== "fridge-light-roommates") return input;
  const s = structuredClone(input);
  const records = new Set(
    Object.values(work.data)
      .flat()
      .map((i) => i.id),
  );
  const ghosts = s.read.filter(
    (id) =>
      legacyConversationMarkers.some((name) => name === id) && !records.has(id),
  );
  const affected = [
    ...s.choices.map((c) => c.target),
    ...(s.scheduled || []).map((j) => j.nodeId),
  ].filter(retiredOptional);
  const pending = String(s.variables.pendingScene || "");
  const demoStop =
    work.variables.saveFamily === "thursday-public" &&
    s.variables.housingRoute === "stay" &&
    /^public-demo-ending-[12]$/.test(pending);
  if (
    !ghosts.length &&
    !affected.length &&
    !retiredOptional(pending) &&
    !demoStop &&
    !(
      s.variables.sideBusy &&
      retiredOptional(String(s.variables.sideContext || ""))
    )
  )
    return s;
  s.ui ??= {};
  s.ui.compatibility ??= {};
  if (demoStop) {
    s.ui.compatibility.previousDemoStop = pending;
    s.variables.pendingScene = "scene-viewing-contract";
  }
  if (ghosts.length) {
    const prior = s.ui.compatibility.legacyConversationReads;
    s.ui.compatibility.legacyConversationReads = [
      ...new Set([...(Array.isArray(prior) ? prior : []), ...ghosts]),
    ];
    s.read = s.read.filter((id) => !ghosts.includes(id));
  }
  if (
    affected.length ||
    retiredOptional(pending) ||
    (s.variables.sideBusy &&
      retiredOptional(String(s.variables.sideContext || "")))
  ) {
    const prior = s.ui.compatibility.retiredActiveAnchors;
    s.ui.compatibility.retiredActiveAnchors = [
      ...new Set([...(Array.isArray(prior) ? prior : []), ...affected]),
    ];
    s.choices = s.choices.filter((c) => !retiredOptional(c.target));
    s.scheduled = (s.scheduled || []).filter((j) => !retiredOptional(j.nodeId));
    if (retiredOptional(String(s.variables.sideContext || ""))) {
      s.variables.sideBusy = false;
      s.variables.sideContext = "";
    }
    if (retiredOptional(String(s.variables.s3Awaiting || "")))
      s.variables.s3Awaiting = "";
    if (retiredOptional(String(s.ui.messages?.replyDraft || ""))) {
      s.ui.compatibility.retiredDraft = String(s.ui.messages.replyDraft);
      if (String(s.ui.messages.replyDraft).startsWith("life-topic-small"))
        s.ui.messages.previousStage3InteractionDraft = s.ui.messages.replyDraft;
      s.ui.messages.replyDraft = "";
    }
    // Optional conversations never consumed the pending main date. Retain it.
    // At the former Stage2 stop the existing release continuation opens Dec4.
    if (retiredOptional(pending)) {
      const scenes = new Set(
        work.nodes.filter((n) => n.event === "continueScene").map((n) => n.id),
      );
      const next = [...s.completed]
        .reverse()
        .flatMap((id) => work.nodes.find((n) => n.id === id)?.actions || [])
        .find(
          (a) =>
            a.type === "variable" &&
            a.key === "pendingScene" &&
            typeof a.value === "string" &&
            scenes.has(a.value) &&
            !s.completed.includes(a.value),
        );
      if (next) {
        s.ui.compatibility.previousOptionalScene = pending;
        s.variables.pendingScene = String(next.value);
      }
    }
  }
  return s;
}
