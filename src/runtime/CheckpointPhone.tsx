import { useEffect, useState } from "react";
import { Phone } from "../Phone";
import { db } from "../persistence";
import type { Runtime, Work } from "../schema";
import { viewingCheckpoint, roommateCheckpoint } from "./checkpoint";

// A separate local preview save keeps the player's normal run untouched.
export function CheckpointPhone({
  work,
  start = "viewing",
}: {
  work: Work;
  start?: "viewing" | "roommates";
}) {
  const [state, setState] = useState<Runtime | null>(null);
  const [error, setError] = useState("");
  const id = work.id + ":preview:" + start;
  const checkpoint =
    start === "roommates" ? roommateCheckpoint : viewingCheckpoint;
  useEffect(() => {
    let active = true;
    db.saves
      .get(id)
      .then((saved) => {
        if (active)
          setState(
            saved?.state.revision === work.updatedAt
              ? saved.state
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
    void db.saves
      .put({ id, state: value })
      .catch(() => setError("试玩存档未能保存"));
  }
  if (!state) return <p role="status">{error || "正在打开看房当天…"}</p>;
  return <Phone work={work} runtime={state} onRuntime={update} />;
}
