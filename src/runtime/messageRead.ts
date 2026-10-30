import { orderedMessages } from "./messageOrder";
import { storyDatedItem } from "./storyDates";
import type { Item, Runtime, Work } from "../schema";
import { visible } from "../engine";
import { notificationContent } from "../SystemNotifications";
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
  const messages = visibleMessages(work, state);
  const unreadIds = new Set(unreadMessages(work, state).map((i) => i.id));
  const notifications = state.notifications.filter((text) => {
    const notice = notificationContent(text, work.apps);
    if (notice.appId !== "messages") return true;
    const thread = messages.filter(
      (m) => m.title === notice.title && !m.outgoing,
    );
    if (!thread.length) return true;
    const matching = thread.filter((m) => m.body === notice.body);
    if (matching.length) return matching.some((m) => unreadIds.has(m.id));
    // Summary notices stay until this sender has no unread delivered bubbles.
    return (
      thread.some((m) => unreadIds.has(m.id)) ||
      Boolean(state.scheduled?.length)
    );
  });
  return notifications.length === state.notifications.length
    ? state
    : { ...state, notifications };
}
