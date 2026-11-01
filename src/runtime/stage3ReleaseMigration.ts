import type { Runtime, Work } from "../schema";

export const retiredStage3Topic = (id: string) =>
  /^(life-topic-movie|life-topic-food)(-|$)/.test(
    id.replace(/^(deliver-|read-|topic:)/, ""),
  );

// Narrow structural migration. Keep genuine sent history, choices, movie state
// and unrelated jobs. Retiring an optional topic must not replay the main story.
export function migrateStage3Release(work: Work, saved: Runtime): Runtime {
  if (work.variables.s3ReleaseRevision !== 1) return saved;
  const s = structuredClone(saved);
  // This marker is runtime-only: an old cached runtime merges new defaults,
  // so a capability flag in work.variables cannot prove migration was run.
  if (s.variables.s3ReleaseMigrationApplied !== true) {
    const interrupted =
      retiredStage3Topic(String(s.variables.sideContext || "")) &&
      Boolean(s.variables.sideBusy);
    s.choices = s.choices.filter((c) => !retiredStage3Topic(c.target));
    s.scheduled = (s.scheduled || []).filter(
      (j) => !retiredStage3Topic(j.nodeId),
    );
    if (interrupted) {
      s.variables.sideBusy = false;
      s.variables.sideContext = "";
    }
    if (retiredStage3Topic(String(s.variables.s3Awaiting || "")))
      s.variables.s3Awaiting = "";
    const ui = s.ui?.messages;
    if (ui?.replyDraft && retiredStage3Topic(String(ui.replyDraft))) {
      ui.previousRetiredTopicDraft = ui.replyDraft;
      ui.replyDraft = "";
    }
    // Completed local r21 classroom rounds continue with the new second round,
    // never erase the actual first choice or send it again. Photographs keep
    // their approved date; the extended classroom conversation is the finale.
    const oldClass = [1, 2].some((n) =>
      s.completed.includes(`s3-class-memory-send-${n}-finish`),
    );
    const inClass = s.completed.includes("s3-jan17");
    if (Number(s.variables.lifeStage) === 3 && !s.endings.length) {
      if (s.variables.pendingScene === "s3-jan17" && !inClass)
        s.variables.pendingScene = "s3-jan19-friends";
      if (oldClass || inClass || s.variables.s3ReviewComplete === true) {
        s.variables.s3ReviewComplete = false;
        s.variables.s3PreviewPaused = false;
        s.variables.releaseComplete = false;
        for (const id of ["ig-photo-friends", "s3-ig-friends-mirror"])
          if (!s.unlocked.includes(id)) s.unlocked.push(id);
        if ((s.date || "") < "2027-01-20") {
          s.date = "2027-01-20";
          s.time = "19:40";
        }
        s.variables.pendingScene = "";
        if (oldClass && !s.choices.length && !s.scheduled.length) {
          const round = work.nodes.find((n) => n.id === "s3-class-memory-r2");
          s.choices = (round?.next || []).map((target) => ({
            target,
            label: work.nodes.find((n) => n.id === target)!.label,
          }));
        } else if (
          s.variables.s3Awaiting === "s3-class-memory-send-1-reply-2" &&
          s.unlocked.includes("s3-class-memory-send-1-reply-2") &&
          !s.unlocked.includes("s3-class-memory-send-1-reply-3") &&
          !s.scheduled.length
        ) {
          s.scheduled.push({
            nodeId: "deliver-s3-class-memory-send-1-reply-3",
            due: (s.elapsedMs || 0) + 3000,
          });
        }
      }
    }
    s.variables.s3ReleaseRevision = 1;
    s.variables.s3ReleaseMigrationApplied = true;
  }
  const dogDone =
    s.variables.dogStoryHeard === true ||
    Number(s.variables.s3DogRound) >= 5 ||
    [1, 2].some((n) => s.completed.includes(`life-dog-close-send-${n}-finish`));
  if (dogDone && work.data.threads?.some((i) => i.id === "s3-post-dog")) {
    if (!s.unlocked.includes("s3-post-dog")) s.unlocked.push("s3-post-dog");
    if (!s.variables["postDate-s3-post-dog"])
      s.variables["postDate-s3-post-dog"] = s.date || "2027-01-11";
    if (!s.variables["postTime-s3-post-dog"])
      s.variables["postTime-s3-post-dog"] = s.time;
  }
  return s;
}
