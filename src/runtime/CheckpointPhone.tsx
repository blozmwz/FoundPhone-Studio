import { restoreRuntime } from "./saveMigration";
import { useEffect, useState } from "react";
import { Phone } from "../Phone";
import { persistRuntime, readSavedRuntime } from "../persistence";
import type { Runtime, Work } from "../schema";
import {
  viewingCheckpoint,
  roommateCheckpoint,
  stage2Checkpoint,
  stage2TailCheckpoint,
  stage3Checkpoint,
  stage3MotorCheckpoint,
  stage3RamenCheckpoint,
  stage3ReviewState,
  pizzaCheckpoint,
  instagramCheckpoint,
} from "./checkpoint";

// A separate local preview save keeps the player's normal run untouched.
export function CheckpointPhone({
  work,
  start = "viewing",
}: {
  work: Work;
  start?:
    | "viewing"
    | "roommates"
    | "stage2tail"
    | "stage2"
    | "stage3motor"
    | "stage3ramen"
    | "stage3review"
    | "stage3"
    | "pizza"
    | "instagram"
    | "menu";
}) {
  const [state, setState] = useState<Runtime | null>(null);
  const [error, setError] = useState("");
  const [restartKey, setRestartKey] = useState(0);
  const id = work.id + ":preview:" + start;
  const stopsAtStage3 = start.startsWith("stage3") || start === "stage2tail";
  const checkpoint = {
    viewing: viewingCheckpoint,
    roommates: roommateCheckpoint,
    stage2: stage2Checkpoint,
    stage2tail: stage2TailCheckpoint,
    stage3: stage3Checkpoint,
    stage3review: stage3Checkpoint,
    stage3motor: stage3MotorCheckpoint,
    stage3ramen: stage3RamenCheckpoint,
    pizza: pizzaCheckpoint,
    instagram: instagramCheckpoint,
    menu: instagramCheckpoint,
  }[start];
  useEffect(() => {
    let active = true;
    readSavedRuntime(id)
      .then((saved) => {
        if (active)
          setState(
            stopsAtStage3
              ? stage3ReviewState(
                  saved ? restoreRuntime(work, saved.state) : checkpoint(work),
                )
              : saved
                ? restoreRuntime(work, saved.state)
                : checkpoint(work),
          );
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [id, work, checkpoint, stopsAtStage3]);
  function update(next: Runtime) {
    // The existing ending's Restart button returns to this preview's start.
    const value =
      !next.read.length && !next.variables.openingReviewComplete
        ? checkpoint(work)
        : next;
    const preview = stopsAtStage3 ? stage3ReviewState(value) : value;
    setState(preview);
    void persistRuntime(id, preview).catch(() => setError("试玩存档未能保存"));
  }
  if (!state) return <p role="status">{error || "正在打开试玩节点…"}</p>;
  return (
    <>
      {(start === "stage2tail" ||
        start === "stage2" ||
        start.startsWith("stage3") ||
        start === "pizza" ||
        start === "instagram" ||
        start === "menu") && (
        <aside className="stage2-preview-tools">
          <span>
            {start === "stage2tail"
              ? "本地 Stage 2 末尾 → Stage 3 试玩"
              : start === "menu"
                ? "本地外卖菜单预览"
                : start === "instagram"
                  ? "本地 Instagram 预览"
                  : start === "pizza"
                    ? "本地第⑥段 · 点披萨"
                    : start.startsWith("stage3")
                      ? "本地 Stage 3 试玩"
                      : "本地 Stage 2 试玩"}
          </span>
          <button
            onClick={() => {
              if (!confirm("重新开始这个独立试玩进度？名字和正常存档会保留。"))
                return;
              update(checkpoint(work));
              setRestartKey((key) => key + 1);
            }}
          >
            {start === "stage2tail"
              ? "从 Stage 2 末尾重看"
              : start === "menu"
                ? "重置菜单预览存档"
                : start === "instagram"
                  ? "重置 IG 预览存档"
                  : start === "pizza"
                    ? "从第⑥段重新试玩"
                    : start.startsWith("stage3")
                      ? "从头重看 Stage 3"
                      : "从头重看 Stage 2"}
          </button>
          {error && <span role="status">{error}</span>}
        </aside>
      )}
      <Phone
        key={restartKey}
        work={work}
        runtime={state}
        saveKey={id}
        onRuntime={update}
      />
    </>
  );
}
