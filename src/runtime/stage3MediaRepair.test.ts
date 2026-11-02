import {stage3ReleaseStory} from "../../scripts/release-stage3.mjs";
import { it, expect } from "vitest";
import source from "../../stories/template/story.json";
import publicSource from "../../stories/template/story.json";
import oldSaves from "../../tests/fixtures/stage3-r1-media-saves.json";
import { compileStory } from "../story-engine/compiler";
import { advance, dispatch, visible } from "../engine";
import type { Runtime } from "../schema";
import { restoreRuntime } from "./saveMigration";
import { currentInstagramStories, instagramNow } from "./instagramModel";
import {
  motorStoryReplies,
  instagramInteraction,
} from "./instagramInteractions";
import { availableTopics } from "./lifeInteractions";
import { storyContinuation } from "./continuation";
const { work } = compileStory(publicSource);
const photos = [
  "s3-photo-ramen-1",
  "s3-photo-ramen-2",
  "s3-photo-ramen-3",
  "s3-photo-ramen-4",
];
const stories = ["s3-ig-motor", "s3-ig-motor-2"];
const old = oldSaves as unknown as Record<string, Runtime>;
it("published dependency closure includes companion event, both original images and album records", async () => {
  expect(work.nodes.some((n) => n.id === "s3-motor-story-ready")).toBe(true);
  for (const id of stories) {
    const item = work.data.instagram.find((i) => i.id === id)!;
    expect(item).toBeDefined();
    const original = source.content.instagram.find((i) => i.id === id)!;
    expect(item.media.length).toBe(original.media!.length);
    expect(item.media === original.media).toBe(true);
    expect(item.time).toBe("2026-12-27 19:20");
  }
  expect(work.data.photos.map((i) => i.id)).toEqual(photos);
  expect(work.nodes.some((n) => n.id === "authorContinueStage3")).toBe(false);
});
it("new motor date publishes first, opening apps never sends, seeing a Story enables only a draftable question", () => {
  let s = restoreRuntime(work, old["before-motor-2"]);
  expect(s.unlocked).not.toContain(stories[0]);
  expect(availableTopics(work, s).some((i) => i.id === "s3-topic-motor")).toBe(
    false,
  );
  s = dispatch(work, s, "continueScene", "s3-dec27");
  expect(s.choices).toEqual([]);
  expect(s.scheduled).toEqual([]);
  expect(storyContinuation(work, s)?.item.id).toBe(stories[0]);
  expect(
    currentInstagramStories(
      work.data.instagram.filter((i) => visible(i, s)),
      instagramNow(s.date, s.time),
    )
      .filter((i) => stories.includes(i.id))
      .map((i) => i.id),
  ).toEqual(stories);
  s = restoreRuntime(work, dispatch(work, s, "openApp", "instagram"));
  expect(s.choices).toEqual([]);
  s = dispatch(work, s, "read", stories[1]);
  expect(s.choices).toHaveLength(2);
    expect(motorStoryReplies(work,s,stories[1])).toHaveLength(2);
  expect(s.completed).not.toContain("s3-motor-question-send-1");
  const target = s.choices[0].target;
  s.ui = { messages: { replyDraft: target } };
  s = restoreRuntime(work, s);
  expect(s.completed).not.toContain(target);
  s = instagramInteraction(work, s, "igStoryReply", stories[1] + "\t" + target);
  expect(s.completed).toContain(target);
  expect(s.scheduled?.length).toBeGreaterThan(0);
  s = advance(work, restoreRuntime(work, s), 120000);
  expect(s.unlocked.filter((i) => i === target + "-out-1")).toHaveLength(1);
});
it.each(Object.entries(old))(
  "real public1503 %s recovers media without replaying choices or conversations",
  (name, save) => {
    const s = restoreRuntime(work, save);
    expect(s.revision).toBe(1504);
    expect(s.completed).toEqual(save.completed);
    expect(s.read).toEqual(save.read);
    expect(s.scheduled).toEqual(save.scheduled);
    expect(s.endings).toEqual(save.endings);
    expect(s.date).toBe(save.date);
    expect(s.time).toBe(save.time);
    if (save.completed.includes("s3-dec27"))
      for (const id of stories) expect(s.unlocked).toContain(id);
    if (name.startsWith("motor-unseen")) {
      expect(s.choices).toEqual([]);
      expect(s.variables.s3MotorStorySeen).toBe(false);
    } else expect(s.choices).toEqual(save.choices);
    for (const id of photos)
      expect(s.unlocked.includes(id)).toBe(
        save.completed.includes("s3-ramen-after"),
      );
    expect(restoreRuntime(work, s)).toEqual(s);
  },
);
it("food photos exist immediately after the actual meal, before any post or player reply, with identical original pixels", () => {
  let s = restoreRuntime(work, old["before-meal-2"]);
  expect(work.data.photos.filter((i) => visible(i, s))).toEqual([]);
  s = dispatch(work, s, "continueScene", "s3-ramen-after");
  expect(s.variables.s3RamenMealDone).not.toBe(true);
  expect(s.unlocked).not.toContain("s3-ig-ramen");
  expect(work.data.photos.filter((i) => visible(i, s))).toHaveLength(4);
  work.data.photos.forEach((p, index) => {
    expect(p.time.startsWith("2026-12-30")).toBe(true);
    expect(p.body).toBe("");
    expect(
      p.media ===
        work.data.instagram.find(
          (i) =>
            i.id ===
            ["s3-ig-ramen", "s3-ig-ramen-2", "s3-ig-ramen-3", "s3-ig-ramen-4"][
              index
            ],
        )!.media,
    ).toBe(true);
  });
});
it("post-level baseline likes are modest, distinct, and never duplicate into carousel child pages", () => {
  expect(
    ["ig-history-macau", "ig-history-nyc", "s3-ig-ramen"].map(
      (id) => work.data.instagram.find((i) => i.id === id)!.likes,
    ),
  ).toEqual([38, 46, 32]);
  for (const i of work.data.instagram.filter(
    (i) => i.meta.albumOnly === "true",
  ))
    expect(i.likes).toBe(0);
});

it("an old already-completed question container offers its held choices after Story viewing without replaying a sent message",()=>{
 let s=restoreRuntime(work,old["motor-unseen-2"]);expect(s.completed).toContain("s3-motor-question");expect(s.choices).toEqual([]);s=dispatch(work,s,"read","s3-ig-motor");expect(s.choices.map(c=>c.target)).toEqual(["s3-motor-question-send-1","s3-motor-question-send-2"]);const targets=s.choices;s=dispatch(work,s,"read","s3-ig-motor-2");expect(s.choices).toEqual(targets);expect(s.completed).not.toContain("s3-motor-question-send-1");expect(s.unlocked).not.toContain("s3-motor-question-send-1-out-1");
});

it("the release collector follows a same-target companion handler even when the old release had neither Story",()=>{
 const previous=structuredClone(compileStory(publicSource).story);
 previous.content.instagram=previous.content.instagram.filter(i=>!["s3-ig-motor","s3-ig-motor-2"].includes(i.id));previous.content.photos=[];previous.events=previous.events.filter(n=>n.id!=="s3-motor-story-ready");
 const release=stage3ReleaseStory(source,previous);
 expect(release.events.some(n=>n.id==="s3-motor-story-ready")).toBe(true);
 for(const id of ["s3-ig-motor","s3-ig-motor-2"])expect(release.content.instagram.some(i=>i.id===id)).toBe(true);
 expect(release.content.photos).toHaveLength(4);
});
