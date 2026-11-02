import oldTopics from "../../tests/fixtures/stage2-r4/retired-topics.json";
import { expect, it } from "vitest";

import pubInput from "../../stories/template/story.json";
import draft from "../../tests/fixtures/stage2-r4/actual-draft.json";
import sending from "../../tests/fixtures/stage2-r4/actual-sending.json";
import endA from "../../tests/fixtures/stage2-r4/end-a.json";
import endB from "../../tests/fixtures/stage2-r4/end-b.json";
import refused from "../../tests/fixtures/stage2-r4/refused.json";
const oldInputs: Record<string, unknown> = {
  "actual-draft": draft,
  "actual-sending": sending,
  "end-a": endA,
  "end-b": endB,
  refused,
};

import { compileStory } from "../story-engine/compiler";
import { advance, choose, dispatch } from "../engine";
import { initialRuntime, type Runtime } from "../schema";
import { restoreRuntime } from "./saveMigration";
import { pendingScene } from "./scenePacing";
import { storyContinuation } from "./continuation";
import { lifeInteraction } from "./lifeInteractions";
import { retiredStage3Topic } from "./stage3ReleaseMigration";

const pub = pubInput;
const release = compileStory(pub).work;
it.each(["actual-draft", "actual-sending", "end-a", "end-b", "refused"])(
  "actual published r4 save %s migrates to 1503 without clearing progress",
  (name) => {
    const old = (oldInputs[name] as { state: Runtime }).state;
    let s = restoreRuntime(release, old);
    expect(s.revision).toBe(1505);
    expect(s.completed).toEqual(old.completed);
    expect(s.read).toEqual(old.read);
    expect(s.unlocked).toEqual(old.unlocked);
    expect(s.endings).toEqual(old.endings);
    expect(s.date).toBe(old.date);
    expect(s.ui?.messages?.replyDraft).toBe(old.ui?.messages?.replyDraft);
    if (name.startsWith("end-")) {
      expect(pendingScene(release, s)?.id).toBe("s3-dec04");
      s = dispatch(release, s, "continueScene", "s3-dec04");
      s = advance(release, restoreRuntime(release, s), 120000);
      expect(s.unlocked).toContain("s3-dec04-in-2");
      expect(s.unlocked.some(retiredStage3Topic)).toBe(false);
    }
  },
);
it.each(Array.from({ length: 16 }, (_, i) => i))(
  "all sixteen finale A/B combinations complete in order and survive refresh: %s",
  (mask) => {
    let s = dispatch(release, initialRuntime(release), "start");
    for (const t of pub.tests[2].steps) {
      if (t.advanceMs !== undefined) s = advance(release, s, t.advanceMs);
      if (t.event) s = dispatch(release, s, t.event, t.target);
      if (t.choose) s = choose(release, s, t.choose);
      if (t.target === "s3-jan17") break;
    }
    for (let round = 0; round < 4; round++) {
      expect(s.choices).toHaveLength(2);
      const option = (mask >> round) & 1;
      const target = s.choices[option].target;
      s.ui = { messages: { replyDraft: target } };
      s = restoreRuntime(release, s);
      expect(s.completed).not.toContain(target);
      s = choose(release, s, target);
      s = advance(release, restoreRuntime(release, s), 120000);
      const next = storyContinuation(release, s);
      expect(next?.item.id.startsWith(target + "-reply-")).toBe(true);
      s = dispatch(release, s, "read", next!.item.id);
      s = restoreRuntime(release, s);
    }
    expect(s.variables.s3ReviewComplete).toBe(true);
    expect(s.variables.releaseComplete).toBe(true);
    expect(s.endings).toEqual([]);
    expect(s.choices).toEqual([]);
    expect(pendingScene(release, s)).toBeNull();
    expect(lifeInteraction(release, s, "topic", "life-topic-food")).toBe(s);
  },
);
it("public source contains no Stage4/5 scene, future record, ending or author continuation", () => {
  for (const n of pub.events) {
    expect(n.id).not.toBe("authorContinueStage3");
    for (const a of n.actions) {
      if (a.type === "date") expect(String(a.value) < "2027-02-01").toBe(true);
      if (a.key === "lifeStage") expect(Number(a.value)).toBeLessThanOrEqual(3);
    }
  }
  const records = [
    ...pub.chats.flatMap(
      (c: { messages: { id: string; time?: string }[] }) => c.messages,
    ),
    ...Object.values(pub.content).flat(),
  ] as { id: string; time?: string }[];
  expect(
    records.some((i) =>
      /almost-kiss|reunion|diary-goodbye|life-post-nearly/.test(i.id),
    ),
  ).toBe(false);
  for (const r of records)
    if (r.time) expect(r.time < "2027-02-01", r.id).toBe(true);
});

it.each(Object.entries(oldTopics))('1502 interrupted optional topic %s is retired without swallowing the next stage',(name,input)=>{
 const old=input as unknown as Runtime;
 const s=restoreRuntime(release,old);
 expect(s.completed).toEqual(old.completed);expect(s.read).toEqual(old.read);expect(s.unlocked).toEqual(old.unlocked);
 expect(s.scheduled).toEqual([]);expect(s.choices).toEqual([]);expect(s.variables.sideBusy).toBe(false);expect(s.variables.pendingScene).toBe('s3-dec04');
 expect(String(s.ui?.messages?.replyDraft||'')).not.toMatch(/^topic:life-topic-(food|movie)/);
 expect(restoreRuntime(release,s)).toEqual(s);
});

it('an old cached runtime merging new work defaults cannot falsely mark the migration complete',()=>{
 const old=structuredClone(oldTopics['life-topic-movie-queued']) as unknown as Runtime;
 // Emulate r4 restoreRuntime loading the new work before its SW has upgraded.
 old.variables={...release.variables,...old.variables};old.revision=1503;
 const s=restoreRuntime(release,old);
 expect(s.scheduled).toEqual([]);expect(s.variables.sideBusy).toBe(false);
 expect(s.variables.pendingScene).toBe('s3-dec04');
 expect(s.variables.s3ReleaseMigrationApplied).toBe(true);
 expect(s.completed).toEqual(old.completed);
});
