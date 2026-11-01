import type { Runtime, Work } from "../schema";
export function pendingScene(work: Work, state: Runtime) {
  if (
    work.id !== "fridge-light-roommates" ||
    state.endings.length ||
    state.variables.sideBusy ||
    state.choices.length ||
    state.scheduled?.length
  )
    return null;
  const id = state.variables.pendingScene;
  const node = work.nodes.find(
    (n) => n.id === id && n.event === "continueScene",
  );
  const date =
    node?.actions.find((a) => a.type === "date")?.value ?? state.date;
  const time = String(
    node?.actions.find((a) => a.type === "time")?.value || state.time,
  );
  if (!node || typeof date !== "string") return null;
  const days = Math.max(
    0,
    Math.round(
      (Date.parse(date + "T00:00:00Z") -
        Date.parse(state.date + "T00:00:00Z")) /
        86400000,
    ),
  );
  const hour = Number(time.slice(0, 2));
  const period =
    hour < 6 ? "凌晨" : hour < 12 ? "上午" : hour < 18 ? "下午" : "晚上";
  const label =
    days === 0 ? "当天" + period : days === 1 ? "第二天" : `${days} 天后`;
  return { id: node.id, date, time, days, label };
}
