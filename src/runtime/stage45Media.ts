import type { Runtime, Work } from '../schema';

// Additive repair for author previews that already passed these dates/events.
// Keep original publication dates and read/like state. Never replay a chat or
// pretend an expired Story was posted today.
export function unlockStage45Media(work: Work, state: Runtime): void {
  if (work.variables.saveFamily !== 'thursday-author' || work.variables.authorMediaRevision !== 1 || Number(state.variables.lifeStage) < 4) return;
  const now = `${state.date || ''} ${state.time || ''}`;
  const rideComplete = state.variables.s45Ride2 === true && state.completed.includes('s45-mar27-after');
  const celebrated = state.variables.s45Celebrated === true || (state.variables.s45Offer === true && (state.date || '') > '2027-03-05');
  for (const app of ['instagram', 'photos']) for (const item of work.data[app] || []) {
    const rule = item.meta.authorMediaRule;
    // r31 has a single real celebration meal in April. Keep already unlocked
    // March photos in old histories, but do not manufacture that retired meal.
    if (rule === 'celebration' && work.nodes.some(n=>n.id==='s29-jan18-apply')) continue;
    if (!rule || now < item.time || (rule === 'ride2' && !rideComplete) || (rule === 'celebration' && !celebrated)) continue;
    if (!state.unlocked.includes(item.id)) state.unlocked.push(item.id);
  }
}
