import { pendingScene } from "./scenePacing";
import { testCondition, visible } from "../engine";
import type { Runtime, Work } from "../schema";

// Derived from the authored graph and the existing save. No parallel quest state
// and no hints about hidden records or unchosen branches.
export function storyContinuation(work: Work, state: Runtime) {
  if (
    work.id !== "fridge-light-roommates" ||
    state.endings.length ||
    pendingScene(work, state) ||
    state.choices.length ||
    state.scheduled?.length
  )
    return null;
  const targets = new Set(
    work.nodes
      .filter((node) => {
        if (
          node.event !== "read" ||
          (node.once && state.completed.includes(node.id))
        )
          return false;
        const tests = node.conditions.map((c) => testCondition(c, state));
        return node.logic === "or"
          ? tests.some(Boolean)
          : node.logic === "not"
            ? !tests.every(Boolean)
            : tests.every(Boolean);
      })
      .map((node) => node.target),
  );
  for (const [appId, items] of Object.entries(work.data)) {
    if (!work.apps.some((app) => app.id === appId && app.installed)) continue;
    const item = items.find(
      (item) =>
        targets.has(item.id) &&
        !state.read.includes(item.id) &&
        visible(item, state),
    );
    if (item) return { appId, item };
  }
  return null;
}
