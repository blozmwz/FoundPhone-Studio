import type { Item, Runtime } from "../schema";

// Authored scene dates follow the player's confirmed appointment, including
// when the conversation is revisited after a later date or a saved reload.
export function storyDatedItem(item: Item, state: Runtime): Item {
  const date = state.variables[item.meta.dateVariable];
  const time = state.variables[item.meta.timeVariable];
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return item;
  return {
    ...item,
    time: `${date} ${typeof time === "string" ? time : item.time.slice(11)}`,
  };
}
