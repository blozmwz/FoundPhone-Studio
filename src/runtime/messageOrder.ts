import type { Item } from "../schema";

// Authored bubbles often share a minute. The persisted unlock sequence is their
// delivery order, including player sends, and survives reopening or refreshing.
export function orderedMessages(
  items: readonly Item[],
  unlocked: readonly string[],
) {
  const delivered = new Map(unlocked.map((id, index) => [id, index]));
  return [...items].sort(
    (a, b) =>
      a.time.localeCompare(b.time) ||
      (delivered.get(a.id) ?? -1) - (delivered.get(b.id) ?? -1),
  );
}
