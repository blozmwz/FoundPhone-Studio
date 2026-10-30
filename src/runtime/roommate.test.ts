import { expect, it } from "vitest";
import source from "../../stories/template/story.json";
import previous from "../../tests/fixtures/public-stage1.story.json";
import previousWork from "../../tests/fixtures/public-stage1.work.json";
import { compileStory } from "../story-engine/compiler";
import { testStory } from "../story-engine/testStory";
import { initialRuntime, validateWork, type Runtime } from "../schema";
import { advance, choose, dispatch } from "../engine";
import { restoreRuntime } from "./saveMigration";
import { encodeBackup, decodeBackup } from "./saveBackup";
import { housingCheckpoint } from "./checkpoint";
import { pendingScene } from "./scenePacing";
import { storyContinuation } from "./continuation";
const { work, story } = compileStory(source);
const old = {
  story: compileStory(previous).story,
  work: validateWork(previousWork),
};
function oldState(route: number, stop = -1) {
  let s = dispatch(old.work, initialRuntime(old.work), "start");
  for (const [index, step] of old.story.tests[route].steps.entries()) {
    if (index === stop) break;
    if (step.advanceMs !== undefined) s = advance(old.work, s, step.advanceMs);
    if (step.event) s = dispatch(old.work, s, step.event, step.target);
    if (step.choose) s = choose(old.work, s, step.choose);
  }
  return s;
}
function finish(state: Runtime) {
  for (let turn = 0; turn < 1000; turn++) {
    state = advance(work, state, 120000);
    if (state.endings.length || state.variables.releaseComplete === true)
      return state;
    if (state.choices.length)
      state = choose(
        work,
        state,
        state.choices.find((c) => c.target === "choose-house-stay")?.target ??
          state.choices[0].target,
      );
    else if (pendingScene(work, state))
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    else {
      const next = storyContinuation(work, state);
      if (!next)
        throw Error(
          "stuck at " +
            JSON.stringify([
              state.date,
              state.variables.pendingScene,
              state.read.slice(-3),
            ]),
        );
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error(
    "loop " +
      JSON.stringify([
        state.date,
        state.choices,
        state.variables.pendingScene,
        state.scheduled,
        state.read.slice(-3),
        state.variables,
      ]),
  );
}
it("candidate includes only Stage1+2 and all its authored routes pass", () => {
  expect(testStory(story, work)).toEqual([]);
  const all = Object.values(work.data).flat();
  expect(all.every((i) => i.time < "2026-11-21")).toBe(true);
  for (const id of [
    "life-film1-morning-in-1",
    "life-nearly-in-1",
    "diary-nearly-kiss",
    "ig-photo-window",
    "ig-photo-friends",
    "life-reunion-1",
  ])
    expect(all.some((i) => i.id === id)).toBe(false);
  expect(
    work.nodes.some((n) =>
      n.actions.some((a) => a.key === "lifeStage" && Number(a.value) >= 3),
    ),
  ).toBe(false);
  expect(
    all
      .filter(
        (i) =>
          i.meta.handle === "i_m_hendery" &&
          i.meta.profile !== "true" &&
          i.meta.story !== "true" &&
          i.meta.albumOnly !== "true",
      )
      .map((i) => i.id),
  ).toEqual(["ig-history-macau", "ig-history-nyc"]);
});
it.each([2, 3])(
  "actual old public finished rental route %s migrates and reaches Stage2 boundary",
  (route) => {
    const oldSave = oldState(route);
    expect(oldSave.revision).toBe(1501);
    expect(oldSave.endings[0]).toContain("前两章试玩结束");
    const before = JSON.stringify(oldSave);
    const migrated = restoreRuntime(work, JSON.parse(before));
    expect(JSON.stringify(oldSave)).toBe(before);
    expect(migrated.read).toEqual(oldSave.read);
    expect(oldSave.unlocked.every((id) => migrated.unlocked.includes(id))).toBe(
      true,
    );
    expect(migrated.endings).toEqual([]);
    expect(migrated.variables.pendingScene).toBe("scene-viewing-contract");
    expect(restoreRuntime(work, migrated)).toEqual(migrated);
    const final = finish(migrated);
    expect(final.date).toBe("2026-11-20");
    expect(final.endings).toEqual([]);
    expect(final.variables.releaseComplete).toBe(true);
  },
);
it.each([0, 1])(
  "actual old refused route %s keeps ending and can retry housing without route leakage",
  (route) => {
    const saved = oldState(route),
      migrated = restoreRuntime(work, saved);
    expect(migrated.endings).toEqual(saved.endings);
    const branch = housingCheckpoint(work, migrated);
    expect(branch.endings).toEqual([]);
    expect(branch.variables.igAccess).toBeUndefined();
    expect(branch.choices.map((c) => c.target)).toContain("choose-house-stay");
    expect(branch.variables.viewingDate).toBe(saved.variables.viewingDate);
    expect(
      finish(choose(work, branch, "choose-house-stay")).variables
        .releaseComplete,
    ).toBe(true);
  },
);
it.each([4, 11, 24, 36, 48, 55])(
  "in-flight old public save at step %s continues without reset",
  (stop) => {
    const saved = oldState(2, stop),
      migrated = restoreRuntime(work, saved);
    expect(migrated.read).toEqual(saved.read);
    expect(finish(migrated).variables.releaseComplete).toBe(true);
  },
);
it("defaults missing new fields, validates backups and rejects incompatible imports", () => {
  const saved = oldState(2);
  const legacy = JSON.parse(JSON.stringify(saved));
  delete legacy.ui;
  delete legacy.scheduled;
  delete legacy.elapsedMs;
  delete legacy.clockRemainderMs;
  const restored = restoreRuntime(work, legacy);
  expect(restored.ui).toEqual({});
  expect(restored.scheduled).toEqual([]);
  const backup = decodeBackup(work, encodeBackup(saved, "小林"));
  expect(backup.playerName).toBe("小林");
  expect(backup.state.read).toEqual(saved.read);
  expect(() => decodeBackup(work, '{"hello":1}')).toThrow();
  expect(() => decodeBackup(work, "oops")).toThrow();
  expect(() =>
    decodeBackup(work, encodeBackup({ ...saved, workId: "another" }, "小林")),
  ).toThrow();
  expect(() => restoreRuntime(work, { ...saved, revision: 99999 })).toThrow();
});
