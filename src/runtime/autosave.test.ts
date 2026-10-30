import { expect, it } from "vitest";
import source from "../../stories/template/story.json";
import { compileStory } from "../story-engine/compiler";
import { initialRuntime, type Work } from "../schema";
import { dispatch, advance, choose } from "../engine";
import { restoreRuntime } from "./saveMigration";
const { work, story } = compileStory(source);
function saved(final = false) {
  let s = dispatch(work, initialRuntime(work), "start");
  for (const step of story.tests[2].steps) {
    if (!final && step.choose === "s2-film-weekly-reply-send-1") break;
    if (step.advanceMs !== undefined) s = advance(work, s, step.advanceMs);
    if (step.event) s = dispatch(work, s, step.event, step.target);
    if (step.choose) s = choose(work, s, step.choose);
  }
  return s;
}
function future(): Work {
  return { ...structuredClone(work), updatedAt: 1503 };
}
it("accepts a declared additive revision without clearing choices, chat, drafts or timer progress", () => {
  const old = saved();
  old.ui = {
    messages: { replyDraft: old.choices[0].target },
    profile: { playerName: "小林" },
  };
  const next = restoreRuntime(future(), old);
  expect(next.revision).toBe(1503);
  expect(next.completed).toEqual(old.completed);
  expect(next.unlocked).toEqual(old.unlocked);
  expect(next.read).toEqual(old.read);
  expect(next.choices).toEqual(old.choices);
  expect(next.ui).toEqual(old.ui);
  expect(next.scheduled).toEqual(old.scheduled);
});
it("opens an explicitly declared next stage for a player at the old release stop", () => {
  const next = future();
  next.variables.resumeAfterRelease = "test-next-stage";
  next.nodes.push({
    ...next.nodes[0],
    id: "test-next-stage",
    type: "action",
    event: "continueScene",
    target: "test-next-stage",
    actions: [],
    next: [],
    conditions: [],
  });
  const old = saved(true),
    resumed = restoreRuntime(next, old);
  expect(resumed.variables.pendingScene).toBe("test-next-stage");
  expect(resumed.variables.releaseComplete).toBe(false);
  expect(resumed.completed).toEqual(old.completed);
  expect(resumed.read).toEqual(old.read);
  expect(resumed.endings).toEqual([]);
  expect(restoreRuntime(next, resumed)).toEqual(resumed);
});
it("never treats a genuine refusal as an update checkpoint", () => {
  let s = dispatch(work, initialRuntime(work), "start");
  for (const step of story.tests[0].steps) {
    if (step.advanceMs !== undefined) s = advance(work, s, step.advanceMs);
    if (step.event) s = dispatch(work, s, step.event, step.target);
    if (step.choose) s = choose(work, s, step.choose);
  }
  const next = future();
  next.variables.resumeAfterRelease = "nonexistent";
  expect(restoreRuntime(next, s).endings).toEqual(s.endings);
});
it("preserves incompatible active structures and unknown revisions by rejecting instead of resetting", () => {
  const old = saved(),
    original = JSON.stringify(old),
    next = future();
  next.nodes = next.nodes.filter((n) => n.id !== old.choices[0].target);
  expect(() => restoreRuntime(next, old)).toThrow("需要迁移");
  expect(JSON.stringify(old)).toBe(original);
  const undeclared = future();
  delete undeclared.variables.saveCompatibleFrom;
  expect(() => restoreRuntime(undeclared, old)).toThrow("不兼容");
  expect(() => restoreRuntime(work, { ...old, revision: 99999 })).toThrow(
    "不兼容",
  );
});
import previousStory from "../../tests/fixtures/public-stage1.story.json";
import previousWork from "../../tests/fixtures/public-stage1.work.json";
import { validateWork } from "../schema";
it("a later public stage still migrates the original Stage1 demo into rental rather than skipping it", () => {
  const oldWork = validateWork(previousWork);
  let old = dispatch(oldWork, initialRuntime(oldWork), "start");
  for (const step of compileStory(previousStory).story.tests[2].steps) {
    if (step.advanceMs !== undefined)
      old = advance(oldWork, old, step.advanceMs);
    if (step.event) old = dispatch(oldWork, old, step.event, step.target);
    if (step.choose) old = choose(oldWork, old, step.choose);
  }
  const next = future();
  next.variables.releaseStage2 = false;
  const restored = restoreRuntime(next, old);
  expect(restored.endings).toEqual([]);
  expect(restored.variables.pendingScene).toBe("scene-viewing-contract");
  expect(restored.read).toEqual(old.read);
  expect(restored.revision).toBe(1503);
});
