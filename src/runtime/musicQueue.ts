export type PlayMode = 'sequential' | 'shuffle';
export type MusicQueue = { mode: PlayMode; order: string[]; cursor: number; history: string[]; historyCursor: number };
export function shuffled(ids: string[], random = Math.random): string[] {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(Math.max(0, random()) * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function queueFor(ids: string[], selected: string, mode: PlayMode, random = Math.random): MusicQueue {
  const current = ids.includes(selected) ? selected : '';
  const order = mode === 'shuffle' ? [...(current ? [current] : []), ...shuffled(ids.filter(id => id !== current), random)] : [...ids];
  return { mode, order, cursor: Math.max(0, order.indexOf(current)), history: current ? [current] : [], historyCursor: current ? 0 : -1 };
}
export function restoredQueue(ids: string[], selected: string, saved: Record<string, unknown>): MusicQueue {
  const mode: PlayMode = saved.mode === 'shuffle' ? 'shuffle' : 'sequential';
  const order = Array.isArray(saved.queue) ? saved.queue.filter((v): v is string => typeof v === 'string' && ids.includes(v)) : [];
  if (order.length !== ids.length || new Set(order).size !== ids.length) return queueFor(ids, selected, mode);
  const history = Array.isArray(saved.history) ? saved.history.filter((v): v is string => typeof v === 'string' && ids.includes(v)).slice(-100) : [];
  const historyCursor = Number(saved.historyIndex);
  return { mode, order, cursor: Math.max(0, order.indexOf(selected)), history: history.length ? history : selected ? [selected] : [], historyCursor: Number.isInteger(historyCursor) && history[historyCursor] === selected ? historyCursor : Math.max(-1, history.lastIndexOf(selected)) };
}
export function manuallySelected(queue: MusicQueue, ids: string[], selected: string, random = Math.random): MusicQueue {
  const next = queueFor(ids, selected, queue.mode, random);
  const history = [...queue.history.slice(0, queue.historyCursor + 1), selected].slice(-100);
  return { ...next, history, historyCursor: history.length - 1 };
}
export function steppedQueue(queue: MusicQueue, ids: string[], selected: string, direction: 1 | -1, random = Math.random): { queue: MusicQueue; selected: string } {
  if (!ids.length) return { queue, selected: '' };
  const historyIndex = queue.historyCursor + direction;
  if (historyIndex >= 0 && historyIndex < queue.history.length) {
    const next = queue.history[historyIndex];
    return { selected: next, queue: { ...queue, cursor: Math.max(0, queue.order.indexOf(next)), historyCursor: historyIndex } };
  }
  let order = queue.mode === 'sequential' ? [...ids] : [...queue.order];
  let index = order.indexOf(selected);
  if (queue.mode === 'shuffle' && direction === 1 && index === order.length - 1) {
    order = shuffled(ids, random);
    if (order.length > 1 && order[0] === selected) [order[0], order[1]] = [order[1], order[0]];
    index = -1;
  }
  const cursor = index < 0 ? (direction === 1 ? 0 : order.length - 1) : (index + direction + order.length) % order.length;
  const next = order[cursor];
  if (direction === -1) {
    const history = [next, ...queue.history].slice(0, 100);
    return { selected: next, queue: { ...queue, order, cursor, history, historyCursor: 0 } };
  }
  const history = [...queue.history.slice(0, queue.historyCursor + 1), next].slice(-100);
  return { selected: next, queue: { ...queue, order, cursor, history, historyCursor: history.length - 1 } };
}
export function musicTime(seconds: number) {
  const n = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
}
