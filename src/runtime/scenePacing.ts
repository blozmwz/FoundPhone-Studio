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
  let date =
    node?.actions.find((a) => a.type === "date")?.value ?? state.date;
  if (["s45-departure", "s45-arrival"].includes(String(id)) && typeof state.variables.s45MoveDate === "string") date = state.variables.s45MoveDate;
  if (["s45-apr08-film", "s45-apr08-after"].includes(String(id))) date = state.variables.s45MoveDate === "2027-04-15" ? "2027-04-14" : "2027-04-11";
  if (id === "s28-drinks") date = state.variables.s45MoveDate === "2027-04-15" ? "2027-04-12" : "2027-04-10";
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
