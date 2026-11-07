import type { Item, Work } from "./schema";

export function notificationContent(text: string, apps: Work["apps"]) {
  const separator = text.search(/[:：]/);
  const sender = separator > 0 ? text.slice(0, separator).trim() : "信息";
  const app = apps.find((a) => a.name === sender);
  return {
    title: sender,
    body: (separator > 0 ? text.slice(separator + 1) : text).trim(),
    appId: app?.id ?? "messages",
  };
}

export function notificationKey(text: string, apps: Work["apps"]) {
  const notice = notificationContent(text, apps);
  return JSON.stringify([notice.appId, notice.title, notice.body]);
}

export type NoticeGroup = ReturnType<typeof notificationContent> & {
  text: string;
  indices: number[];
  count: number;
};

// Presentation only: count delivered unread bubble IDs, not reminder strings.
// Retain original indices so dismissing a card only removes its notifications.
export function groupedNotifications(
  notices: string[],
  apps: Work["apps"],
  unread?: Item[],
) {
  const groups = new Map<string, NoticeGroup>();
  notices.forEach((text, index) => {
    const notice = notificationContent(text, apps);
    const key = notice.appId === "messages"
      ? JSON.stringify([notice.appId, notice.title])
      : notificationKey(text, apps);
    const previous = groups.get(key);
    groups.delete(key);
    groups.set(key, {
      ...notice,
      text,
      indices: [...(previous?.indices ?? []), index],
      count: 1,
    });
  });
  return [...groups.values()].reverse().map((group) => {
    if (group.appId !== "messages") return group;
    const messages = unread?.filter((m) => m.title === group.title);
    if (!messages?.length) return group;
    const latest = messages.at(-1)!;
    return {
      ...group,
      body: latest.body,
      text: `${group.title}：${latest.body}`,
      count: new Set(messages.map((m) => m.id)).size,
    };
  });
}
