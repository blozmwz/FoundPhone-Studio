import type { Runtime, Work } from "../schema";
export function pendingScene(work: Work, state: Runtime) {
  if (
    work.id !== "fridge-light-roommates" ||
    state.endings.length ||
    state.variables.sideBusy
  )
    return null;
  const id = state.variables.pendingScene;
  const node = work.nodes.find(
    (n) => n.id === id && n.event === "continueScene",
  );
  const date =
    node?.actions.find((a) => a.type === "date")?.value ?? state.date;
  if (!node || typeof date !== "string") return null;
  const days = Math.max(
    0,
    Math.round(
      (Date.parse(date + "T00:00:00Z") -
        Date.parse(state.date + "T00:00:00Z")) /
        86400000,
    ),
  );
  return { id: node.id, date, days };
}
