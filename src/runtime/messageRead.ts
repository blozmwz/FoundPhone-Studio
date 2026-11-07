import { orderedMessages } from "./messageOrder";
import { storyDatedItem } from "./storyDates";
import type { Item, Runtime, Work } from "../schema";
import { visible } from "../engine";
import { notificationContent, notificationKey } from "../notifications";
export function incomingUnread(
  item: Item,
  state: Runtime,
  startDate = "2026-09-17",
) {
  // Pre-story chat history is background, not a newly delivered notification.
  return (
    !item.outgoing &&
    !item.read &&
    !state.read.includes(item.id) &&
    (!item.time || item.time.slice(0, 10) >= startDate)
  );
}
export function visibleMessages(work: Work, state: Runtime) {
  return [
    ...(work.data.messages || []),
    ...(state.messages.messages || []),
  ].filter((i) => visible(i, state));
}
// A read bubble acknowledges the preceding visible bubbles in that conversation.
// This is only a read-receipt watermark; it never dispatches their story events.
export function unreadMessageItems(
  items: Item[],
  state: Runtime,
  startDate = "2026-09-17",
) {
  const ordered = orderedMessages(
    items.map((item) => storyDatedItem(item, state)),
    state.unlocked,
  );
  const through = new Map<string, number>();
  ordered.forEach((m, index) => {
    if (m.read || state.read.includes(m.id)) through.set(m.title, index);
  });
  return ordered.filter(
    (m, index) =>
      index > (through.get(m.title) ?? -1) &&
      incomingUnread(m, state, startDate),
  );
}
export function unreadMessages(work: Work, state: Runtime, thread?: string) {
  return unreadMessageItems(
    visibleMessages(work, state),
    state,
    work.phone.date,
  ).filter((i) => !thread || i.title === thread);
}
export function reconcileReadNotices(work: Work, state: Runtime): Runtime {
  if (work.id !== "fridge-light-roommates") return state;
  const messages = visibleMessages(work, state).map(item => storyDatedItem(item, state));
  const unreadIds = new Set(unreadMessages(work, state).map((i) => i.id));
  const completed = new Set(state.completed);
  const read = new Set(state.read);
  const records = new Map(
    Object.entries(work.data).flatMap(([app, items]) =>
      items.filter((item) => visible(item, state)).map((item) => [item.id, { app, item }] as const),
    ),
  );
  const related = new Map<string, Set<string>>();
  for (const node of work.nodes) {
    if (!completed.has(node.id)) continue;
    for (const action of node.actions) {
      if (action.type !== "notification") continue;
      const text = String(action.value);
      const key = notificationKey(text, work.apps);
      const app = notificationContent(text, work.apps).appId;
      if (app === "messages") continue;
      for (const unlock of node.actions) {
        if (unlock.type !== "unlock" || records.get(unlock.key)?.app !== app) continue;
        const ids = related.get(key) ?? new Set<string>();
        ids.add(unlock.key);
        related.set(key, ids);
      }
    }
  }
  const notifications = state.notifications.filter((text) => {
    const notice = notificationContent(text, work.apps);
    const linked = related.get(notificationKey(text, work.apps));
    // Generic social/notes reminders can refer to several completed events.
    // Dismiss only after their actual records have been read, never on App open.
    if (linked?.size) return [...linked].some((id) => !read.has(id));
    if (notice.appId === "instagram") {
      const candidates = (work.data.instagram || []).filter(
        (item) =>
          item.id.startsWith("s3-") &&
          item.meta.albumOnly !== "true" &&
          item.meta.profile !== "true" &&
          visible(item, state) &&
          (item.body === notice.body ||
            (item.title && notice.body.includes(item.title))),
      );
      const exact = candidates.filter((item) => item.body === notice.body);
      const matching = exact.length ? exact : candidates;
      return (
        !matching.length ||
        matching.some((item) => !state.read.includes(item.id))
      );
    }
    if (notice.appId !== "messages") return true;
    const thread = messages.filter(
      (m) => m.title === notice.title && !m.outgoing,
    );
    if (!thread.length) return true;
    const matching = thread.filter((m) => m.body.trim() === notice.body);
    if (matching.length) return matching.some((m) => unreadIds.has(m.id));
    // Summary notices stay until this sender has no unread delivered bubbles.
    return thread.some((m) => unreadIds.has(m.id));
  }).filter((text, index, all) => {
    const key = notificationKey(text, work.apps);
    return !all.slice(index + 1).some((next) => notificationKey(next, work.apps) === key);
  });
  return notifications.length === state.notifications.length
    ? state
    : { ...state, notifications };
}
