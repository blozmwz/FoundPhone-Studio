import { firstSharedFilm } from "./stage45";
import { HISTORICAL_FILM_TITLES } from "./filmCatalogue";
import type { Item, Runtime } from "../schema";

// Authored scene dates follow the player's confirmed appointment, including
// when the conversation is revisited after a later date or a saved reload.
export function storyDatedItem(item: Item, state: Runtime): Item {
  if (item.meta.s45FirstFilmChoice === "true" && (state.variables.s2FirstFilm === "chungking" || state.variables.s45LegacyFirstChoice === true))
    item = { ...item, body: "今晚看《重庆森林》吧" };
  if (item.meta.s45FilmTitle === "true") {
    const id = firstSharedFilm(state);
    item = { ...item, body: id ? `今晚再看一次《${HISTORICAL_FILM_TITLES[id]}》？` : "今晚再看一次最初那部電影？" };
  }
  if (item.meta.s45ReunionFilm === "true") item = { ...item, body: state.variables.s45ReunionUnfinished ? item.body : "好久沒跟你一起看電影了" };
  if (item.meta.s45BusyVariant === "true" && state.variables.s45BusyHadUnfinished !== true) item = { ...item, body: item.body.replace("电影停在一半", "片单越攒越长") };
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
    time: (typeof time === "string" ? time : item.time.slice(11)) ? `${date} ${typeof time === "string" ? time : item.time.slice(11)}` : date,
  };
}
