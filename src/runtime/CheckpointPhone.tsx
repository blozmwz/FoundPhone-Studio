import { restoreRuntime } from "./saveMigration";
import { useEffect, useState } from "react";
import { Phone } from "../Phone";
import { persistRuntime, readSavedRuntime } from "../persistence";
import type { Runtime, Work } from "../schema";
import {
  viewingCheckpoint,
  roommateCheckpoint,
  stage2Checkpoint,
  pizzaCheckpoint,
  instagramCheckpoint,
} from "./checkpoint";

// A separate local preview save keeps the player's normal run untouched.
export function CheckpointPhone({
  work,
  start = "viewing",
}: {
  work: Work;
  start?: "viewing" | "roommates" | "stage2" | "pizza" | "instagram" | "menu";
}) {
  const [state, setState] = useState<Runtime | null>(null);
  const [error, setError] = useState("");
  const [restartKey, setRestartKey] = useState(0);
  const id = work.id + ":preview:" + start;
  const checkpoint = {
    viewing: viewingCheckpoint,
    roommates: roommateCheckpoint,
    stage2: stage2Checkpoint,
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
            saved?.state.revision === work.updatedAt
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
  }, [id, work, checkpoint]);
  function update(next: Runtime) {
    // The existing ending's Restart button returns to this preview's start.
    const value =
      !next.read.length && !next.variables.openingReviewComplete
        ? checkpoint(work)
        : next;
    setState(value);
    void persistRuntime(id, value).catch(() => setError("试玩存档未能保存"));
  }
  if (!state) return <p role="status">{error || "正在打开试玩节点…"}</p>;
  return (
    <>
      {(start === "stage2" ||
        start === "pizza" ||
        start === "instagram" ||
        start === "menu") && (
        <aside className="stage2-preview-tools">
          <span>
            {start === "menu"
              ? "本地外卖菜单预览"
              : start === "instagram"
                ? "本地 Instagram 预览"
                : start === "pizza"
                  ? "本地第⑥段 · 点披萨"
                  : "本地 Stage 2 试玩"}
          </span>
          <button
            onClick={() => {
              update(checkpoint(work));
              setRestartKey((key) => key + 1);
            }}
          >
            {start === "menu"
              ? "重置菜单预览存档"
              : start === "instagram"
                ? "重置 IG 预览存档"
                : start === "pizza"
                  ? "从第⑥段重新试玩"
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
