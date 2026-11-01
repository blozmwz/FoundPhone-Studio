import { HISTORICAL_FILM_TITLES } from "./filmCatalogue";
import type { Item, Runtime } from "../schema";

// Authored scene dates follow the player's confirmed appointment, including
// when the conversation is revisited after a later date or a saved reload.
export function storyDatedItem(item: Item, state: Runtime): Item {
  if (item.meta.filmSession) {
    const id = String(state.variables["s3Film-" + item.meta.filmSession] || "");
    if (HISTORICAL_FILM_TITLES[id])
      item = {
        ...item,
        body: "今晚看《" + HISTORICAL_FILM_TITLES[id] + "》吧",
      };
  }
  if (item.meta.bodyAfterFlag && state.variables[item.meta.bodyAfterFlag]) {
    let comments = item.comments;
    try {
      const parsed: unknown = item.meta.commentsAfter
        ? JSON.parse(item.meta.commentsAfter)
        : item.comments;
      if (
        Array.isArray(parsed) &&
        parsed.every((value) => typeof value === "string")
      )
        comments = parsed;
    } catch {
      /* A missing optional comment variant leaves the original comments. */
    }
    item = { ...item, body: item.meta.bodyAfter || item.body, comments };
  }
  const date = state.variables[item.meta.dateVariable];
  const time = state.variables[item.meta.timeVariable];
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return item;
  return {
    ...item,
    time: `${date} ${typeof time === "string" ? time : item.time.slice(11)}`,
  };
}
