import type { Item, StoryNode } from "../schema";

// Shared by the story compiler and typing indicator. No random values: reloads
// resume the same persisted engine schedule rather than inventing a new reply.
export const messagePacing = {
  readingMs: 900,
  thinkingMs: 1000,
  characterMs: 95,
  minimumMs: 2000,
  maximumMs: 6500,
  typingWindowMs: 2800,
  followBottomPx: 72,
};

export function replyDelay(body: string, id: string) {
  const variation = [...id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 650;
  return Math.min(
    messagePacing.maximumMs,
    Math.max(
      messagePacing.minimumMs,
      messagePacing.readingMs +
        messagePacing.thinkingMs +
        body.length * messagePacing.characterMs +
        variation,
    ),
  );
}

export function paceRoommateMessages(nodes: StoryNode[], messages: Item[]) {
  for (const node of nodes) {
    if (node.type !== "delay") continue;
    const incoming = node.actions.flatMap((a) =>
      a.type === "unlock"
        ? messages.filter((m) => m.id === a.key && !m.outgoing)
        : [],
    );
    if (incoming.length)
      node.delayMs = Math.max(...incoming.map((m) => replyDelay(m.body, m.id)));
  }
}
