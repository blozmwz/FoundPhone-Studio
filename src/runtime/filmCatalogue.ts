import { visible } from "../engine";
import type { Runtime, Work } from "../schema";
export const FILM_TITLES: Record<string, string> = {
  spring: "过春天",
  chungking: "重庆森林",
  mood: "花样年华",
  bluegate: "蓝色大门",
  letter: "情书",
  seaside: "海街日记",
  before: "爱在黎明破晓前",
  flipped: "怦然心动",
  forest: "小森林",
};
// Removed from new selections, retained only to render a genuine old chat.
export const HISTORICAL_FILM_TITLES: Record<string, string> = {
  ...FILM_TITLES,
  comrades: "心动",
};
export function narrativeFilmOpen(state: Runtime) {
  const session = String(state.variables.s3FilmCurrent || "");
  return state.variables["s3FilmState-" + session] === "watching";
}
// Catalogue operations are explicit player actions, never acknowledgement of an
// unsent chat choice. Hidden/unreleased titles cannot be selected through imports.
export function catalogueInteraction(
  work: Work,
  state: Runtime,
  event: string,
  target: string,
): Runtime | null {
  if (
    work.variables.s3PolishRevision !== 1 ||
    Number(state.variables.lifeStage || 0) < 3 ||
    !["planFilm", "watchFilm", "filmStatus"].includes(event)
  )
    return null;
  const match =
    event === "filmStatus" ? /^(.*)-(finished|unfinished)$/.exec(target) : null;
  const id = match?.[1] || target;
  const film = work.data.netflix?.find(
    (i) => i.meta.film === id && visible(i, state),
  );
  if (
    !film ||
    !FILM_TITLES[id] ||
    film.meta.retired === "true" ||
    state.endings.length
  )
    return state;
  const next = structuredClone(state);
  if (event === "planFilm") {
    next.variables.filmPlan = id;
    return next;
  }
  if (event === "watchFilm") {
    if (Number(state.variables.lifeStage) < 3 || narrativeFilmOpen(state))
      return state;
    const old = String(state.variables["filmStatus-" + id] || "");
    next.variables["filmViewingMode-" + id] =
      old === "finished" ? "replay" : old === "unfinished" ? "resume" : "first";
    next.variables["filmPreviousStatus-" + id] = old;
    next.variables["filmStatus-" + id] = "watching";
    next.variables["filmReportReady-" + id] = true;
    next.variables.filmPlan = id;
    return next;
  }
  if (
    !match ||
    state.variables["filmReportReady-" + id] !== true ||
    (narrativeFilmOpen(state) &&
      state.variables["s3Film-" + String(state.variables.s3FilmCurrent)] === id)
  )
    return state;
  next.variables["filmStatus-" + id] = match[2];
  const session = ["dec04", "dec22", "jan08"]
    .filter((k) => next.variables["s3Film-" + k] === id)
    .at(-1);
  if (session) next.variables["s3FilmState-" + session] = match[2];
  return next;
}
