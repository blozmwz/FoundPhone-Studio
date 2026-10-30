import type { Item } from "../schema";
export const IG_DAY_MS = 24 * 60 * 60 * 1000;
export const IG_STORY_MS = 9000;
export function instagramTime(value: string) {
  const normalized = value.trim().replace(" ", "T");
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized)
    ? Date.parse(normalized.slice(0, 16) + ":00Z")
    : NaN;
}
export function instagramNow(date = "", time = "") {
  return instagramTime(date + " " + time);
}
// Phone already filters authored unlock/branch conditions. Date/dependency checks
// are a second guard, and do not unlock anything or advance the story engine.
export function instagramContent(items: Item[], now: number) {
  const ids = new Set(items.map((i) => i.id));
  return items
    .filter((i) => {
      if (i.meta.profile === "true") return true;
      if (i.meta.sourceStory && !ids.has(i.meta.sourceStory)) return false;
      const published = instagramTime(i.time);
      return (
        !Number.isFinite(published) || !Number.isFinite(now) || published <= now
      );
    })
    .map((i) => {
      const source = items.find((parent) => parent.id === i.meta.sourceStory);
      return source
        ? {
            ...i,
            media: i.media || source.media,
            avatar: i.avatar || source.avatar,
          }
        : i;
    });
}
export function currentInstagramStories(items: Item[], now: number) {
  return items
    .filter(
      (i) =>
        i.meta.story === "true" &&
        Number.isFinite(now) &&
        now - instagramTime(i.time) >= 0 &&
        now - instagramTime(i.time) < IG_DAY_MS,
    )
    .sort((a, b) => a.time.localeCompare(b.time));
}
export function instagramDate(item: Item, now: number, archive = false) {
  const time = instagramTime(item.time),
    age = now - time;
  if (!archive && Number.isFinite(age) && age >= 0 && age < IG_DAY_MS) {
    const minutes = Math.floor(age / 60000);
    return minutes < 1
      ? "刚刚"
      : minutes < 60
        ? `${minutes}分钟前`
        : `${Math.floor(minutes / 60)}小时前`;
  }
  const date = item.time.slice(0, 10).split("-");
  return date.length === 3
    ? `${Number(date[1])}月${Number(date[2])}日`
    : item.time;
}
