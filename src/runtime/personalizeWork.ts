import type { Work } from "../schema";

// Author data and exported story files never contain a player's real name.
// Resolve the one explicit token in both bubbles and their notifications.
export function personalizeWork(work: Work, name: string): Work {
  const replace = (text: string) => text.replaceAll("{{playerName}}", name);
  return {
    ...work,
    phone: { ...work.phone, owner: name },
    data: {
      ...work.data,
      ...Object.fromEntries(
        Object.entries(work.data).map(([app, items]) => [
          app,
          items.map((item) => ({
            ...item,
            title: replace(item.title),
            body: replace(item.body),
            sender: replace(item.sender),
            comments: item.comments.map(replace),
            meta: Object.fromEntries(
              Object.entries(item.meta).map(([k, v]) => [k, replace(v)]),
            ),
          })),
        ]),
      ),
    },
    nodes: work.nodes.map((node) => ({
      ...node,
      actions: node.actions.map((action) =>
        action.type === "notification" && typeof action.value === "string"
          ? { ...action, value: replace(action.value) }
          : action,
      ),
    })),
  };
}
