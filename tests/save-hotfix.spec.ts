import {
  test,
  expect,
  chromium,
  webkit,
  devices,
  type Page,
} from "@playwright/test";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Runtime } from "../src/schema";
const cases = JSON.parse(
  readFileSync("tests/fixtures/released-save-recovery.json", "utf8"),
) as Record<string, Runtime>;
const base = process.env.SAVE_FIX_URL || "http://127.0.0.1:5202/";
const id = "fridge-light-roommates";
async function row(p: Page, key = id): Promise<{ state: Runtime } | undefined> {
  return p.evaluate(
    (key) =>
      new Promise((resolve) => {
        const r = indexedDB.open("foundphone-studio");
        r.onsuccess = () => {
          const q = r.result.transaction("saves").objectStore("saves").get(key);
          q.onsuccess = () => {
            r.result.close();
            resolve(q.result);
          };
        };
      }),
    key,
  );
}
async function seed(p: Page, state: Runtime, journal = false) {
  await p.goto(base + "?template=blank");
  await p.evaluate(
    async ({ state, journal }) => {
      localStorage.setItem("foundphone-player-name", "旧版独立验证");
      localStorage.removeItem("foundphone-pending:" + state.workId);
      if (journal)
        localStorage.setItem(
          "foundphone-pending:" + state.workId,
          JSON.stringify(state),
        );
      await new Promise<void>((resolve) => {
        const r = indexedDB.open("foundphone-studio");
        r.onupgradeneeded = () => {
          r.result.createObjectStore("saves", { keyPath: "id" });
          r.result.createObjectStore("works", { keyPath: "id" });
        };
        r.onsuccess = () => {
          const tx = r.result.transaction("saves", "readwrite");
          tx.objectStore("saves").put({ id: state.workId, state });
          tx.oncomplete = () => {
            r.result.close();
            resolve();
          };
        };
      });
    },
    { state, journal },
  );
  await p.goto(base);
}
async function migrated(p: Page) {
  await expect.poll(async () => (await row(p))?.state.revision).toBe(1505);
  await expect(
    p.getByText("这次剧情结构变化需要迁移，原存档已保留，未重新开始。", {
      exact: true,
    }),
  ).toHaveCount(0);
}
async function unlock(p: Page) {
  await p.getByRole("button", { name: "轻触解锁", exact: true }).click();
  for (const n of "0917")
    await p.getByRole("button", { name: "密码键" + n, exact: true }).click();
}
async function home(p: Page) {
  if (await p.locator(".phone-screen").getAttribute("data-app"))
    await p.getByRole("button", { name: "返回桌面", exact: true }).click();
}
async function chat(p: Page, name: string) {
  await home(p);
  await p.getByRole("button", { name: "打开信息", exact: true }).click();
  if (
    await p
      .getByRole("button", { name: "查看" + name + "头像大图", exact: true })
      .isVisible()
  )
    return;
  const back = p.getByRole("button", { name: "返回信息列表", exact: true });
  if (await back.isVisible()) await back.click();
  await p
    .getByRole("button", { name: "与 " + name + " 的会话", exact: true })
    .click();
}
for (const [name, old] of Object.entries(cases))
  test(
    "released " + name + " restores exact raw backup and real progress",
    async ({ page }) => {
      await seed(page, old);
      await migrated(page);
      const s = (await row(page))!.state;
      expect(s.date).toBe(old.date);
      expect(s.completed).toEqual(
        old.completed.filter((i) => !i.startsWith("public-demo-ending-")),
      );
      expect(s.read).toEqual(
        old.read.filter((i) => !["Hendery", "Yuki"].includes(i)),
      );
      expect((await row(page, id + ":before-migration"))!.state).toEqual(old);
      await page.reload();
      await migrated(page);
      expect((await row(page))!.state.completed).toEqual(s.completed);
      expect((await row(page, id + ":before-migration"))!.state).toEqual(old);
    },
  );
test("old Stage2 end advances to Dec4 without retired conversations, through actual phone control", async ({
  page,
}) => {
  await seed(page, cases["stage2-r4-1502-stage2-end"]);
  await migrated(page);
  await unlock(page);
  await page
    .getByRole("button", { name: "继续到下一段日常", exact: true })
    .click();
  await expect
    .poll(async () => (await row(page))?.state.date)
    .toBe("2026-12-04");
  const s = (await row(page))!.state;
  expect(
    s.scheduled?.every((j) => !j.nodeId.startsWith("deliver-life-topic-")),
  ).toBe(true);
  expect(s.choices.every((c) => !c.target.startsWith("life-topic-"))).toBe(
    true,
  );
  await chat(page, "Hendery");
  await expect(
    page.getByRole("button", { name: "视频通话", exact: true }),
  ).toBeDisabled();
});
test("mid-response refresh keeps one delivery and unsent draft stays unsent", async ({
  page,
}) => {
  const old = cases["actual-ui-1502-actual-sending"];
  await seed(page, old, true);
  await migrated(page);
  await page.reload();
  await migrated(page);
  await unlock(page);
  await chat(page, "Yuki");
  await expect
    .poll(async () => (await row(page))?.state.choices.length, {
      timeout: 25000,
    })
    .toBe(2);
  const s = (await row(page))!.state;
  for (const job of old.scheduled || [])
    expect(s.completed.filter((n) => n === job.nodeId)).toHaveLength(1);
  expect(s.completed).not.toContain("yuki-opening-area-send-1");
  await page.reload();
  await migrated(page);
  expect((await row(page))!.state.completed).toEqual(s.completed);
  const draft = cases["actual-ui-1502-actual-draft"];
  await seed(page, draft);
  await migrated(page);
  await page.reload();
  await migrated(page);
  expect((await row(page))!.state.ui?.messages?.replyDraft).toBe(
    "yuki-opening-reaction-send-1",
  );
  expect((await row(page))!.state.completed).toEqual(draft.completed);
});
test("raw update backup can be downloaded from Settings", async ({ page }) => {
  const old = cases["actual-ui-video-Yuki"];
  await seed(page, old);
  await migrated(page);
  await unlock(page);
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("button", { name: /游戏进度/ }).click();
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出更新前存档", exact: true })
    .click();
  const file = await dl;
  const body = JSON.parse(readFileSync((await file.path())!, "utf8"));
  expect(body.state).toEqual(old);
  expect(body.playerName).toBe("旧版独立验证");
});
test("unknown node and failed current-save commit preserve DB and journal", async ({
  page,
}) => {
  const old = structuredClone(cases["actual-ui-video-Yuki"]);
  old.variables.pendingScene = "unmapped-real-scene";
  await seed(page, old, true);
  await page
    .getByText("这次剧情结构变化需要迁移，原存档已保留，未重新开始。", {
      exact: true,
    })
    .waitFor();
  expect((await row(page))!.state).toEqual(old);
  expect((await row(page, id + ":before-migration"))!.state).toEqual(old);
  expect(
    await page.evaluate(
      (id) => JSON.parse(localStorage.getItem("foundphone-pending:" + id)!),
      id,
    ),
  ).toEqual(old);
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (v, ...rest) {
      if (
        this.name === "saves" &&
        v?.id === "fridge-light-roommates" &&
        v?.state?.revision === 1505
      )
        throw new DOMException("test write failure", "QuotaExceededError");
      return original.call(this, v, ...rest);
    };
  });
  await seed(page, cases["actual-ui-video-Hendery"], true);
  await expect(
    page.getByRole("button", { name: "导出保留的旧存档", exact: true }),
  ).toBeVisible();
  expect((await row(page))!.state).toEqual(cases["actual-ui-video-Hendery"]);
  expect((await row(page, id + ":before-migration"))!.state).toEqual(
    cases["actual-ui-video-Hendery"],
  );
});
for (const browser of ["chrome", "webkit"] as const)
  test(
    browser + " persistent profile closes and reopens without replay",
    async () => {
      const dir = await mkdtemp(join(tmpdir(), "thursday-save-fix-"));
      const launcher = browser === "webkit" ? webkit : chromium;
      const options =
        browser === "webkit"
          ? {
              ...devices["iPhone 13"],
              channel: "",
              headless: true,
              serviceWorkers: "block" as const,
            }
          : {
              channel: "chrome",
              headless: true,
              serviceWorkers: "block" as const,
            };
      let ctx = await launcher.launchPersistentContext(dir, options);
      let page = await ctx.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await seed(page, cases["actual-ui-video-Hendery"]);
      await migrated(page);
      await unlock(page);
      await chat(page, "Hendery");
      await expect(
        page.getByRole("button", { name: "视频通话", exact: true }),
      ).toBeDisabled();
      const snapshot = (await row(page))!.state;
      await page.screenshot({
        path: "outputs/save-hotfix-" + browser + ".png",
      });
      await ctx.close();
      ctx = await launcher.launchPersistentContext(dir, options);
      try {
        page = await ctx.newPage();
        await page.goto(base);
        await migrated(page);
        expect((await row(page))!.state.completed).toEqual(snapshot.completed);
        expect((await row(page))!.state.read).toEqual(snapshot.read);
        expect((await row(page, id + ":before-migration"))!.state).toEqual(
          cases["actual-ui-video-Hendery"],
        );
        expect(errors).toEqual([]);
      } finally {
        await ctx.close();
      }
    },
  );
