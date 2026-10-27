import { describe, expect, it } from "vitest";
import source from "../../stories/template/story.json";
import { compileStory } from "../story-engine/compiler";
import { advance, choose, dispatch, visible } from "../engine";
import { initialRuntime } from "../schema";
import { defaultLayout, homeEntries, validateLayout } from "../launcher/layout";
import { replyThread } from "./RoommateMessages";

const { work, story } = compileStory(source);
describe("roommate story integration", () => {
  it("routes every real story choice into the conversation receiving the player's message", () => {
    for (const node of work.nodes.filter((n) => n.type === "choice")) {
      const choices = node.next.map((id) => ({
        target: id,
        label: work.nodes.find((n) => n.id === id)!.label,
      }));
      const expected =
        node.id === "yuki-before-intro-choice" ? "Yuki" : "Hendery";
      expect(replyThread(work, choices)).toBe(expected);
      for (const c of choices) {
        expect(replyThread(work, [c])).toBe(expected);
        const state = choose(
          work,
          { ...initialRuntime(work), choices },
          c.target,
        );
        const outgoing = work.data.messages.filter(
          (m) => m.outgoing && state.unlocked.includes(m.id),
        );
        expect(
          outgoing.some((m) => m.title === expected && m.body === c.label),
        ).toBe(true);
      }
    }
  });
  it("migrates a saved desktop that hid Instagram and Threads to the approved native layout", () => {
    const old = defaultLayout(work);
    old.previewLayoutRevision = 0;
    old.apps.forEach((a) => {
      if (["instagram", "threads"].includes(a.id)) {
        a.visible = false;
        a.folder = "海外";
      }
    });
    old.widgets = [{ id: "widget-old-clock", type: "clock", size: "small" }];
    const migrated = validateLayout(JSON.parse(JSON.stringify(old)), work);
    expect(homeEntries(migrated).map((e) => e.key)).toEqual(
      expect.arrayContaining(["instagram", "threads", "notes"]),
    );
    expect(migrated.widgets).toEqual([]);
    expect(
      migrated.apps
        .filter((a) => a.installed && a.visible && a.dock)
        .map((a) => a.id),
    ).toEqual(["phone", "messages", "safari", "music"]);
    expect(migrated.apps.find((a) => a.id === "appstore")?.installed).toBe(
      false,
    );
  });
  it("resumes delayed messages from a saved mid-conversation state and reaches every authored ending path", () => {
    for (const route of story.tests) {
      let state = dispatch(work, initialRuntime(work), "start");
      for (const step of route.steps) {
        state = JSON.parse(JSON.stringify(state));
        if (step.advanceMs !== undefined)
          state = advance(work, state, step.advanceMs);
        if (step.event === "read") {
          const item = Object.values(work.data)
            .flat()
            .find((m) => m.id === step.target)!;
          expect(visible(item, state), step.target).toBe(true);
        }
        if (step.event) state = dispatch(work, state, step.event, step.target);
        if (step.choose) {
          expect(replyThread(work, state.choices)).not.toBe("");
          state = choose(work, state, step.choose);
        }
      }
      expect(state.endings).toContain(route.ending);
    }
  });
});
