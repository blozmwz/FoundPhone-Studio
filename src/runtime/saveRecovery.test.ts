import { it, expect } from "vitest";
import input from "../../tests/fixtures/released-save-recovery.json";
import source from "../../stories/template/story.json";
import { compileStory } from "../story-engine/compiler";
import { type Runtime } from "../schema";
import { restoreRuntime } from "./saveMigration";
import { restoreWithBackup, type MigrationStore } from "./restoreWithBackup";
import { saveAnchorIssues, SaveAnchorError } from "./saveCompatibility";
const { work } = compileStory(source);
const cases = input as unknown as Record<string, Runtime>;
it.each(Object.entries(cases))(
  "actual released save %s migrates and is idempotent without losing real read history",
  (key, old) => {
    const next = restoreRuntime(work, old);
    expect(next.revision).toBe(1505);
    expect(next.date).toBe(old.date);
    expect(next.time).toBe(old.time);
    const real = old.read.filter((id) => !["Hendery", "Yuki"].includes(id));
    expect(next.read).toEqual(real);
    const removed = old.read.filter((id) => ["Hendery", "Yuki"].includes(id));
    if (removed.length)
      expect(next.ui?.compatibility?.legacyConversationReads).toEqual(removed);
    expect(next.completed).toEqual(
      old.completed.filter((id) => !id.startsWith("public-demo-ending-")),
    );
    if (old.revision !== 1501)
      expect(next.endings).toEqual(
        old.endings.filter((e) => !e.startsWith("Stage 2 试玩结束｜")),
      );
    expect(restoreRuntime(work, next)).toEqual(next);
    for (const ids of Object.values(saveAnchorIssues(work, next)))
      expect(ids).toEqual([]);
  },
);
function memory(original: Runtime, fail?: "backup" | "commit") {
  let current = structuredClone(original);
  const backups: Runtime[] = [],
    events: string[] = [];
  const store: MigrationStore = {
    read: async () => ({ state: structuredClone(current) }),
    backup: async (s) => {
      events.push("backup");
      if (fail === "backup") throw Error("backup failed");
      backups.push(structuredClone(s));
    },
    commit: async (before, after) => {
      events.push("commit");
      expect(current).toEqual(before);
      if (fail === "commit") throw Error("write failed");
      current = structuredClone(after);
    },
  };
  return { store, backups, events, get: () => current };
}
it("backs up byte-identical original before committing and restores the player name", async () => {
  const old = cases["actual-ui-video-Hendery"],
    m = memory(old);
  const next = await restoreWithBackup(work, "旧版独立验证", m.store);
  expect(m.events).toEqual(["backup", "commit"]);
  expect(JSON.stringify(m.backups[0])).toBe(JSON.stringify(old));
  expect(next?.ui?.profile?.playerName).toBe("旧版独立验证");
  expect(m.get().revision).toBe(1505);
  expect(m.get().completed).toEqual(old.completed);
});
it.each(["backup", "commit"] as const)(
  "failed %s never replaces the original progress",
  async (failure) => {
    const old = cases["actual-ui-video-Yuki"],
      m = memory(old, failure);
    await expect(
      restoreWithBackup(work, "旧版独立验证", m.store),
    ).rejects.toThrow();
    expect(m.get()).toEqual(old);
    if (failure === "commit") expect(m.backups).toEqual([old]);
  },
);
it("unknown deleted anchors stay blocked with exact diagnostics and a preserved raw backup", async () => {
  const old = structuredClone(cases["actual-ui-video-Hendery"]);
  old.variables.pendingScene = "unmapped-real-scene";
  const m = memory(old);
  await expect(
    restoreWithBackup(work, "旧版独立验证", m.store),
  ).rejects.toThrow("需要迁移");
  expect(m.events).toEqual(["backup"]);
  expect(m.get()).toEqual(old);
  expect(m.backups[0]).toEqual(old);
  try {
    restoreRuntime(work, old);
  } catch (e) {
    expect(e).toBeInstanceOf(SaveAnchorError);
    expect((e as SaveAnchorError).details.pending).toEqual([
      "unmapped-real-scene",
    ]);
  }
});
it("same-version invalid anchors are validated too; another name or future version is not silently accepted", () => {
  const old = structuredClone(cases["actual-ui-video-Yuki"]);
  old.revision = 1505;
  old.read.push("unknown-record");
  expect(() => restoreRuntime(work, old)).toThrow("需要迁移");
  old.revision = 99999;
  expect(() => restoreRuntime(work, old)).toThrow("不兼容");
});
it("retired optional anchors resume the existing main date and preserve sent history even if old defaults claimed migration was done", () => {
  const old = structuredClone(cases["stage2-r4-1502-stage2-end"]);
  old.variables.s3ReleaseMigrationApplied = true;
  old.variables.releaseComplete = false;
  old.variables.pendingScene = "s3-dec04";
  old.variables.sideBusy = true;
  old.variables.sideContext = "life-topic-movie";
  old.choices = [
    { label: "旧未发送", target: "life-topic-movie-follow-send-1" },
  ];
  old.scheduled = [
    { nodeId: "deliver-life-topic-movie-follow-send-1-reply-1", due: 100 },
  ];
  const next = restoreRuntime(work, old);
  expect(next.choices).toEqual([]);
  expect(next.scheduled).toEqual([]);
  expect(next.variables.pendingScene).toBe("s3-dec04");
  expect(next.read).toEqual(old.read);
  expect(next.completed).toEqual(old.completed);
  expect(restoreRuntime(work, next)).toEqual(next);
});
