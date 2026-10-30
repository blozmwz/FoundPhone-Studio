import type { Item } from "../schema";
function rank(value: string) {
  let n = 2166136261;
  for (const c of value) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
export function availableThreadContent(
  items: Item[],
  date = "",
  time = "23:59",
) {
  const now = date + " " + time;
  return items.filter(
    (i) => i.meta.recommendationPool !== "true" || !date || i.time <= now,
  );
}
export function recommendedThreads(feed: Item[], round: number, date: string) {
  const core = feed.filter((i) => i.meta.recommendationPool !== "true");
  const pool = feed
    .filter((i) => i.meta.recommendationPool === "true")
    .sort(
      (a, b) =>
        rank(date + ":" + Math.floor(round / 3) + a.id) -
        rank(date + ":" + Math.floor(round / 3) + b.id),
    );
  const offset = pool.length ? (round * 2) % pool.length : 0;
  const selected = [...pool.slice(offset), ...pool.slice(0, offset)].slice(
    0,
    6,
  );
  const result: Item[] = [];
  for (let n = 0; n < Math.max(core.length, selected.length); n++) {
    if (core[n]) result.push(core[n]);
    if (selected[n]) result.push(selected[n]);
  }
  return result;
}
