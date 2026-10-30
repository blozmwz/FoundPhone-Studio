import { expect, it } from "vitest";
import source from "../../stories/template/story.json";
import oldWork from "../../tests/fixtures/public-stage1.work.json";
import { compileStory } from "../story-engine/compiler";
import { defaultLayout, validateLayout, homeEntries } from "../launcher/layout";
import { validateWork, initialRuntime, type Runtime } from "../schema";
import { advance, choose, dispatch } from "../engine";
import { lifeInteraction } from "./lifeInteractions";
import { pendingScene } from "./scenePacing";
import { storyContinuation } from "./continuation";
import { unreadMessages, reconcileReadNotices } from "./messageRead";
import { orderedMessages } from "./messageOrder";
import { storyDatedItem } from "./storyDates";
const { work, story } = compileStory(source);
function at(id: string) {
  let s = dispatch(work, initialRuntime(work), "start");
  for (const step of story.tests[2].steps) {
    if (step.advanceMs !== undefined) s = advance(work, s, step.advanceMs);
    if (step.event) s = dispatch(work, s, step.event, step.target);
    if (step.choose) s = choose(work, s, step.choose);
    if (step.target === id || step.choose === id) return s;
  }
  throw Error(id);
}
function drain(state: Runtime) {
  for (let i = 0; i < 60 && state.variables.sideBusy; i++) {
    state = advance(work, state, 120000);
    if (state.choices.length)
      state = choose(work, state, state.choices[0].target);
    else {
      const next = storyContinuation(work, state);
      if (next) state = dispatch(work, state, "read", next.item.id);
      else
        for (const id of state.unlocked.filter(
          (id) => !state.read.includes(id),
        ))
          state = dispatch(work, state, "read", id);
    }
  }
  return state;
}
it("upgrades the real previous desktop without losing custom layout or icons", () => {
  const layout = defaultLayout(validateWork(oldWork));
  layout.previewLayoutRevision = 2;
  layout.order = ["notes", "threads"];
  layout.positions.notes = { page: 0, x: 2, y: 0 };
  layout.cleared = ["safari"];
  const next = validateLayout(layout, work);
  expect(homeEntries(next).map((e) => e.key)).toContain("delivery");
  expect(next.apps.find((a) => a.id === "delivery")).toMatchObject({
    name: "Uber Eats",
    installed: true,
    visible: true,
    icon: work.apps.find((a) => a.id === "delivery")!.icon,
  });
  expect(next.order).toEqual(layout.order);
  expect(next.positions.notes).toEqual(layout.positions.notes);
  expect(next.cleared).toEqual(["safari"]);
  expect(validateLayout(next, work)).toEqual(next);
});
it("keeps real-date unread notices after optional early-roommate food replies", () => {
  let state = at("life-arrived-send-1-reply-2");
  state = lifeInteraction(work, state, "orderFood", "ramen");
  state = drain(state);
  expect(state.variables.sideBusy).toBe(false);
  const old = work.data.messages
    .filter((m) => state.unlocked.includes(m.id))
    .map((m) => storyDatedItem(m, state));
  for (const m of old) state = dispatch(work, state, "read", m.id);
  state = dispatch(work, state, "continueScene", pendingScene(work, state)!.id);
  state = advance(work, state, 120000);
  const expected = work.data.messages.filter(
    (m) =>
      state.unlocked.includes(m.id) &&
      !state.read.includes(m.id) &&
      !m.outgoing,
  );
  expect(expected.length).toBeGreaterThan(0);
  expect(unreadMessages(work, state).map((m) => m.id)).toEqual(
    expected.map((m) => m.id),
  );
  state.notifications.push("Hendery：" + expected[0].body);
  state = reconcileReadNotices(work, state);
  expect(state.notifications).toContain("Hendery：" + expected[0].body);
  const shown = orderedMessages(
    work.data.messages
      .filter((m) => state.unlocked.includes(m.id))
      .map((m) => storyDatedItem(m, state)),
    state.unlocked,
  ).map((m) => m.id);
  const causal = state.unlocked.filter((id) =>
    work.data.messages.some((m) => m.id === id),
  );
  expect(shown).toEqual(causal);
});
import { restoreRuntime } from "./saveMigration";
import { canChatAside } from "./lifeInteractions";
it("repairs already saved early food timestamps without changing replies or choices", () => {
  const state = drain(
    lifeInteraction(
      work,
      at("life-arrived-send-1-reply-2"),
      "orderFood",
      "ramen",
    ),
  );
  const context = String(state.variables.sideContext);
  const key = "sideTime-" + (context || "life-food-1-ramen");
  const saved = JSON.parse(JSON.stringify(state));
  saved.variables[key] = "16:00";
  const restored = restoreRuntime(work, saved);
  expect(restored.unlocked).toEqual(saved.unlocked);
  expect(restored.completed).toEqual(saved.completed);
  expect(restored.read).toEqual(saved.read);
  expect(restored.choices).toEqual(saved.choices);
  expect(restored.variables[key] >= "16:05").toBe(true);
  expect(restoreRuntime(work, restored)).toEqual(restored);
});
it("does not show the next date while a reply or delivery is pending", () => {
  const state = at("life-arrived-send-1-reply-2");
  expect(pendingScene(work, state)).not.toBeNull();
  expect(
    pendingScene(work, {
      ...state,
      choices: [{ target: "test", label: "test" }],
    }),
  ).toBeNull();
  expect(
    pendingScene(work, {
      ...state,
      scheduled: [{ nodeId: "test", due: 1000 }],
    }),
  ).toBeNull();
});
it("permits established optional food at the Stage2 soft stop, preserving its boundary", () => {
  let state = dispatch(work, initialRuntime(work), "start");
  for (const step of story.tests[2].steps) {
    if (step.advanceMs !== undefined)
      state = advance(work, state, step.advanceMs);
    if (step.event) state = dispatch(work, state, step.event, step.target);
    if (step.choose) state = choose(work, state, step.choose);
  }
  expect(state.variables.releaseComplete).toBe(true);
  expect(canChatAside(state)).toBe(true);
  state = drain(lifeInteraction(work, state, "orderFood", "ramen"));
  expect(state.variables.releaseComplete).toBe(true);
  expect(state.date).toBe("2026-11-20");
  expect(state.endings).toEqual([]);
  expect(pendingScene(work, state)).toBeNull();
});
it.each([1, 2, 3, 4, 5, 6, 7, 8])(
  "keeps causal bubble order and two choices across mixed route %s and reloads",
  (seed) => {
    let state = dispatch(work, initialRuntime(work), "start"),
      random = seed;
    for (let step = 0; step < 500; step++) {
      state = advance(work, state, 120000);
      if (step % 5 === 0)
        state = restoreRuntime(work, JSON.parse(JSON.stringify(state)));
      for (const thread of ["Hendery", "Yuki"]) {
        const delivered = state.unlocked.filter((id) =>
          work.data.messages.some((m) => m.id === id && m.title === thread),
        );
        const items = work.data.messages
          .filter((m) => delivered.includes(m.id))
          .map((m) => storyDatedItem(m, state));
        expect(orderedMessages(items, state.unlocked).map((m) => m.id)).toEqual(
          delivered,
        );
        for (const m of items.filter((item) => item.outgoing)) {
          const sends = work.nodes.filter(
            (n) =>
              n.event === "choose" &&
              n.actions.some((a) => a.type === "unlock" && a.key === m.id),
          );
          if (sends.length)
            expect(sends.some((n) => state.completed.includes(n.id))).toBe(
              true,
            );
        }
      }
      if (state.variables.releaseComplete === true) {
        expect(state.date).toBe("2026-11-20");
        expect(state.endings).toEqual([]);
        return;
      }
      if (state.choices.length) {
        expect(state.choices).toHaveLength(2);
        random = (random * 1664525 + 1013904223) >>> 0;
        const housing = state.choices.find(
          (c) => c.target === "choose-house-stay",
        );
        state = choose(
          work,
          state,
          housing?.target ?? state.choices[(random >>> 16) % 2].target,
        );
      } else {
        const next = pendingScene(work, state);
        if (next) {
          const date = state.date;
          state = dispatch(work, state, "continueScene", next.id);
          expect(state.date! >= date!).toBe(true);
        } else {
          const read = storyContinuation(work, state);
          if (read) state = dispatch(work, state, "read", read.item.id);
          else if (!state.scheduled?.length)
            throw Error(
              "no continuation: " +
                JSON.stringify([state.date, state.read.slice(-3)]),
            );
        }
      }
    }
    throw Error("route did not finish");
  },
);
import { canOrderFood } from "./lifeInteractions";
it("food requires a confirmed rental and a completed conversation at both UI and dispatch gates", () => {
  const ready = at("life-arrived-send-1-reply-2");
  expect(canOrderFood(ready)).toBe(true);
  const bad = [
    { ...ready, variables: { ...ready.variables, housingRoute: "decline" } },
    {
      ...ready,
      completed: ready.completed.filter(
        (id) => !/^viewing-rent-send-[12]-continue$/.test(id),
      ),
    },
    { ...ready, choices: [{ target: "pending", label: "pending" }] },
    { ...ready, scheduled: [{ nodeId: "pending", due: 1000 }] },
    { ...ready, variables: { ...ready.variables, sideBusy: true } },
    { ...ready, variables: { ...ready.variables, lifeStage: 0 } },
  ];
  for (const state of bad) {
    expect(canOrderFood(state)).toBe(false);
    expect(lifeInteraction(work, state, "orderFood", "ramen")).toBe(state);
  }
});
it("November20 B keeps the confirmed new wording in both draft choice and sent bubble", () => {
  expect(work.nodes.find((n) => n.id === "life-film2-pick-send-2")?.label).toBe(
    "行 那你选好了叫我",
  );
  expect(
    work.data.messages.find((m) => m.id === "life-film2-pick-send-2-out-1")
      ?.body,
  ).toBe("行 那你选好了叫我");
});
it("updates the November20 unsent choice wording without sending or discarding its draft", () => {
  const state = at("s2-film2-invite-send-1-reply-2");
  state.choices = state.choices.map((c) =>
    c.target === "life-film2-pick-send-2"
      ? { ...c, label: "行 那我等你 你快点" }
      : c,
  );
  state.ui = { ...state.ui, messages: { replyDraft: "life-film2-pick-send-2" } };
  const restored = restoreRuntime(work, state);
  expect(
    restored.choices.find((c) => c.target === "life-film2-pick-send-2")?.label,
  ).toBe("行 那你选好了叫我");
  expect(restored.ui?.messages?.replyDraft).toBe("life-film2-pick-send-2");
  expect(restored.completed).toEqual(state.completed);
  expect(restored.unlocked).toEqual(state.unlocked);
});
