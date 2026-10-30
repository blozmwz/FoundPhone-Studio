import { useEffect, useState } from "react";
import { Phone } from "../Phone";
import { persistRuntime, readSavedRuntime } from "../persistence";
import type { Runtime, Work } from "../schema";
import { restoreRuntime, startFresh } from "./saveMigration";
import { playerNameKey } from "./reviewSlot";
export function ReleaseReview({ work, slot }: { work: Work; slot: string }) {
  const id = work.id + ":rc:" + slot;
  const [state, setState] = useState<Runtime | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    (async () => {
      const saved = await readSavedRuntime(id);
      let value;
      if (saved) value = restoreRuntime(work, saved.state);
      else if (slot !== "new") {
        const response = await fetch("./__review/" + slot + ".json", {
          cache: "no-store",
        });
        if (!response.ok)
          throw Error("缺少上一版格式测试存档，请运行候选版预览服务。");
        const fixture = await response.json();
        value = restoreRuntime(work, fixture.state);
      } else value = startFresh(work);
      if (active) {
        await persistRuntime(id, value);
        setState(value);
      }
    })().catch((e) => setError(String(e)));
    return () => {
      active = false;
    };
  }, [id, slot, work]);
  if (!state) return <p role="status">{error || "正在打开独立试玩存档…"}</p>;
  return (
    <>
      <aside className="stage2-preview-tools">
        <span>
          {slot === "new"
            ? "发布候选 · 新玩家独立存档"
            : slot === "declined"
              ? "发布候选 · 旧拒绝存档"
              : "发布候选 · 旧入住存档"}
        </span>
        <button
          onClick={async () => {
            if (!confirm("只清除这个独立测试存档并重开？正常存档不会改动。"))
              return;
            const { db } = await import("../persistence");
            await db.saves.delete(id);
            localStorage.removeItem("foundphone-pending:" + id);
            localStorage.removeItem(playerNameKey());
            location.reload();
          }}
        >
          重开此测试存档
        </button>
        {error && <span role="alert">{error}</span>}
      </aside>
      <Phone
        work={work}
        runtime={state}
        saveKey={id}
        nameKey={playerNameKey()}
        onRuntime={(next) => {
          setState(next);
          void persistRuntime(id, next).catch(() =>
            setError("测试存档保存失败，请导出备份。"),
          );
        }}
      />
    </>
  );
}
