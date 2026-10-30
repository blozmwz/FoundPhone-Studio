import type { Runtime, Work } from "../schema";
import { storyDatedItem } from "./storyDates";

function messagesById(work: Work, state: Runtime) {
  return new Map(
    [...(work.data.messages || []), ...(state.messages.messages || [])].map(
      (item) => [item.id, item],
    ),
  );
}
// A scene can display a confirmed arrival five minutes ahead of the phone's
// ticking clock. An optional conversation must start after that delivered scene.
export function nextAsideTimestamp(work: Work, state: Runtime) {
  let latest = `${state.date || work.phone.date} ${state.time}`;
  const messages = messagesById(work, state);
  for (const id of state.unlocked) {
    const item = messages.get(id);
    if (!item) continue;
    const time = storyDatedItem(item, state).time;
    if (time > latest) latest = time;
  }
  return { date: latest.slice(0, 10), time: latest.slice(11, 16) };
}
// Correct only optional-conversation clock fields. No re-sends, new unlocks,
// changed choices or moving old conversations to the day of this reload.
export function reconcileAsideTimestamps(work: Work, state: Runtime) {
  if (work.id !== "fridge-light-roommates") return state;
  const messages = messagesById(work, state);
  let previous = "";
  for (const id of state.unlocked) {
    const item = messages.get(id);
    if (!item) continue;
    const { dateVariable, timeVariable } = item.meta;
    let time = storyDatedItem(item, state).time;
    if (
      dateVariable?.startsWith("sideDate-") &&
      timeVariable?.startsWith("sideTime-") &&
      typeof state.variables[dateVariable] === "string" &&
      time < previous
    ) {
      state.variables[dateVariable] = previous.slice(0, 10);
      state.variables[timeVariable] = previous.slice(11, 16);
      time = previous;
    }
    if (time > previous) previous = time;
  }
  return state;
}
