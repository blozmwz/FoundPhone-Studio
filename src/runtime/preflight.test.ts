import { expect, it } from "vitest";
import source from "../../stories/template/story.json";
import { compileStory } from "../story-engine/compiler";
import { initialRuntime } from "../schema";
import { dispatch, advance, choose } from "../engine";
import {
  unreadMessages,
  reconcileReadNotices,
  incomingUnread,
} from "./messageRead";
import { restoreRuntime } from "./saveMigration";
import {
  availableThreadContent,
  recommendedThreads,
} from "../skins/threadsRecommendations";
const { work, story } = compileStory(source);
it("read delivery, archive, other sender and persisted unread state use the same source", () => {
  let state = dispatch(work, initialRuntime(work), "start");
  expect(unreadMessages(work, state).map((m) => m.id)).toEqual([
    "yuki-rent-news",
  ]);
  const archive = work.data.messages.find((m) => m.id === "yuki-archive-name")!;
  expect(incomingUnread(archive, state, work.phone.date)).toBe(false);
  state = reconcileReadNotices(
    work,
    dispatch(work, state, "read", "yuki-rent-news"),
  );
  expect(unreadMessages(work, state)).toEqual([]);
  expect(state.notifications).not.toContain("Yuki：你房东真的要卖房了？");
  state = choose(work, state, "yuki-opening-reaction-send-1");
  state = advance(work, state, 120000);
  expect(unreadMessages(work, state).length).toBeGreaterThan(0);
  const other = work.data.messages.find(
    (m) => m.id === "hendery-first-text-1",
  )!;
  state.unlocked.push(other.id);
  state.notifications.push("Hendery：" + other.body);
  for (const m of unreadMessages(work, state, "Yuki"))
    state = reconcileReadNotices(work, dispatch(work, state, "read", m.id));
  expect(unreadMessages(work, state, "Yuki")).toHaveLength(0);
  expect(unreadMessages(work, state, "Hendery")).toHaveLength(1);
  const restored = restoreRuntime(work, JSON.parse(JSON.stringify(state)));
  expect(unreadMessages(work, restored).map((m) => m.id)).toEqual([other.id]);
  expect(restored.notifications).toContain("Hendery：" + other.body);
});
it("candidate stops softly on both final replies without an ending and old end pages migrate", () => {
  for (const test of story.tests.filter((t) => t.checkpoint)) {
    let state = dispatch(work, initialRuntime(work), "start");
    for (const step of test.steps) {
      if (step.advanceMs !== undefined)
        state = advance(work, state, step.advanceMs);
      if (step.event) state = dispatch(work, state, step.event, step.target);
      if (step.choose) state = choose(work, state, step.choose);
    }
    expect(state.endings).toEqual([]);
    expect(state.variables.releaseComplete).toBe(true);
    expect(state.variables.pendingScene).toBe("");
    const old = {
      ...state,
      endings: ["Stage 2 试玩结束｜为你留着的星期五\n\n本次试玩到这里。后续内容尚未开放，可返回关键分支重新试玩。"],
      variables: { ...state.variables, pendingScene: "life-film1-morning" },
    };
    const resumed = restoreRuntime(work, old);
    expect(resumed.endings).toEqual([]);
    expect(resumed.read).toEqual(state.read);
    expect(resumed.variables.pendingScene).toBe("");
  }
});
it("recommendations rotate existing stable records, never future ones or private identity", () => {
  const all = work.data.threads;
  const now = availableThreadContent(all, "2026-09-17", "10:06");
  expect(now.some((i) => i.id === "pool-food4")).toBe(false);
  const before = JSON.stringify(all);
  const a = recommendedThreads(now, 1, "2026-09-17"),
    b = recommendedThreads(now, 2, "2026-09-17");
  expect(a.map((i) => i.id)).not.toEqual(b.map((i) => i.id));
  expect(JSON.stringify(all)).toBe(before);
  expect(
    a
      .filter((i) => i.meta.recommendationPool === "true")
      .every((i) => i.time <= "2026-09-17 10:06"),
  ).toBe(true);
  expect(
    all
      .filter((i) => i.id.startsWith("pool-"))
      .every((i) => i.sender !== "yobpot"),
  ).toBe(true);
});
it("menu is specific and priced, no bowl replies survive in the release", () => {
  const meals = work.data.delivery.filter(
    (i) => i.meta.authoredOrder !== "true",
  );
  expect(meals).toHaveLength(11);
  expect(meals.every((i) => Number(i.meta.price) > 0 && !!i.body)).toBe(true);
  const text = work.data.messages.map((i) => i.body).join("\n");
  expect(text).not.toMatch(/拿[個个]?碗|找碗|飯碗|饭碗/);
  expect(
    work.apps
      .find((i) => i.id === "delivery")
      ?.icon.startsWith("data:image/png;base64,"),
  ).toBe(true);
});
it("approved diaries unlock after their real event with fixed first-unlock timestamps and isolated final branches", () => {
  for (const route of story.tests.filter((t) => t.checkpoint)) {
    let state = dispatch(work, initialRuntime(work), "start");
    expect(state.unlocked).toContain("approved-post-rent-morning");
    expect(state.unlocked).not.toContain("approved-post-contact");
    for (const step of route.steps) {
      if (step.advanceMs !== undefined)
        state = advance(work, state, step.advanceMs);
      if (step.event) state = dispatch(work, state, step.event, step.target);
      if (step.choose) state = choose(work, state, step.choose);
    }
    const first =
      state.variables["postDate-remote"] +
      " " +
      state.variables["postTime-remote"];
    state = advance(work, state, 300000);
    expect(
      state.variables["postDate-remote"] +
        " " +
        state.variables["postTime-remote"],
    ).toBe(first);
    const selected = state.completed.includes(
      "s2-film-weekly-reply-send-1-finish",
    );
    expect(state.unlocked.includes("approved-post-for-you")).toBe(selected);
    expect(state.unlocked.includes("approved-post-our-friday")).toBe(!selected);
    expect(state.endings).toEqual([]);
  }
});
