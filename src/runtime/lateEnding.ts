import { dispatch } from '../engine';
import type { Runtime, Work } from '../schema';

export function canCloseReunion(state: Runtime) {
  return state.variables.s45Ending === 'B' && state.variables.s45ReunionComplete === true &&
    !state.choices.length && !state.scheduled?.length && state.ui?.messages?.reunionOpen === true;
}
export function beginFinalClose(state:Runtime,reason:'A'|'B'|'reunion'):Runtime {
  if(!state.endings.length || (reason==='reunion'&&!canCloseReunion(state)))return state;
  return {...state,ui:{...state.ui,messages:{...state.ui?.messages,finalPhase:'dark',finalReason:reason,reunionEndCard:false}}};
}
export function completeFinalClose(state:Runtime):Runtime {
  if(state.ui?.messages?.finalPhase!=='dark')return state;
  return {...state,ui:{...state.ui,messages:{...state.ui?.messages,finalPhase:'card',reunionEndCard:true}}};
}
export function closeReunion(state: Runtime): Runtime {
  return canCloseReunion(state)?beginFinalClose(state,'reunion'):state;
}
export function reopenReunion(state: Runtime): Runtime {
  if(!state.ui?.messages?.reunionEndCard)return state;
  const reunion=state.variables.s45ReunionStarted===true;
  return {...state,ui:{...state.ui,messages:{...state.ui?.messages,finalPhase:'',titleOpen:false,
    reunionEndCard:false,reunionOpen:reunion,endingPhase:reunion?'reunion':'browse'}}};
}
export function reviewEnding(state:Runtime):Runtime {
  return {...state,ui:{...state.ui,messages:{...state.ui?.messages,finalPhase:'',titleOpen:false,reunionEndCard:false,reunionOpen:false,endingPhase:'reading'}}};
}
export function beginReunionReview(state:Runtime):Runtime {
  if(state.variables.s45Ending!=='B')return state;
  return {...state,ui:{...state.ui,messages:{...state.ui?.messages,finalPhase:'',titleOpen:false,reunionEndCard:false,reunionOpen:true,endingPhase:'reunion',reunionPhase:state.variables.s45ReunionStarted?'awake':'dark'}}};
}

export function canLockForEnding(state: Runtime) {
  return !state.endings.length && state.variables.s28CanLock === true &&
    ['A','B'].includes(String(state.variables.s28EndingPending)) && !state.choices.length && !state.scheduled?.length;
}
export function beginEndingLock(state: Runtime): Runtime {
  if (!canLockForEnding(state)) return state;
  return { ...state, ui: { ...state.ui, messages: { ...state.ui?.messages, endingPhase: 'dark' } } };
}
export function completeEndingLock(work: Work, state: Runtime): Runtime {
  if (state.ui?.messages?.endingPhase !== 'dark' || !canLockForEnding(state)) return state;
  const next = dispatch(work, state, 'endingPhoneLocked', String(state.variables.s28EndingPending));
  if (!next.endings.length) return state;
  next.ui = { ...next.ui, messages: { ...next.ui?.messages, endingPhase: 'reading' } };
  return next;
}
// An old in-flight conversation keeps its sent choices and bubbles. Only idle
// next-date anchors before the new scene are changed; never turn the clock back.
export function migrateLatePolish(work: Work, state: Runtime): void {
  if (work.variables.stage45PolishRevision !== 1 || state.variables.s28MigrationDone === true) return;
  if (!state.endings.length && !state.choices.length && !state.scheduled?.length && !state.variables.sideBusy) {
    const pending = state.variables.pendingScene, date = state.date || '';
    if (pending === 's45-mar01' && date <= '2027-02-28' && !state.completed.includes('s28-feb28')) state.variables.pendingScene = 's28-feb28';
    if (pending === 's45-apr10-logistics' && date <= '2027-04-05' && state.variables.s45MoveDate && !state.completed.includes('s28-apr05')) state.variables.pendingScene = 's28-apr05';
    const drinksDate = state.variables.s45MoveDate === '2027-04-15' ? '2027-04-12' : '2027-04-10';
    if (pending === 's45-apr08-film' && date <= drinksDate && !state.completed.includes('s28-drinks')) state.variables.pendingScene = 's28-drinks';
  }
  state.variables.s28MigrationDone = true;
}
