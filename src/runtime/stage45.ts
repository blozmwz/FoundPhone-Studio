import { HISTORICAL_FILM_TITLES } from './filmCatalogue';
import type { Runtime, Work } from '../schema';
import { unlockStage45Media } from './stage45Media';
import { migrateLatePolish } from './lateEnding';

export const lateSceneDates: Record<string, string> = {
  's45-jan28':'2027-01-28', 's45-feb05':'2027-02-05',
  's45-feb12':'2027-02-12', 's45-feb13':'2027-02-13',
  's45-feb19':'2027-02-19', 's45-feb26':'2027-02-25',
  's29-feb15-quiet':'2027-02-15', 's29-feb16-quiet-record':'2027-02-16',
  's45-mar01':'2027-03-01', 's45-mar05':'2027-03-05',
  's45-mar05-after':'2027-03-05', 's45-mar08':'2027-03-08', 's45-mar20':'2027-03-20',
  's45-mar27':'2027-03-27', 's45-mar27-after':'2027-03-27',
  's45-apr08-film':'2027-04-11', 's45-apr08-after':'2027-04-11',
  's45-apr10-logistics':'2027-04-10', 's45-departure':'2027-04-12',
  's45-arrival':'2027-04-12',
};
export function firstSharedFilm(state: Runtime) {
  const id=String(state.variables.s2FirstFilm || '');
  return HISTORICAL_FILM_TITLES[id] ? id : '';
}
export function hasUnfinishedFilm(state: Runtime) {
  return Object.keys(HISTORICAL_FILM_TITLES).some(id=>state.variables['filmStatus-'+id]==='unfinished');
}
export function hasUnfinishedSharedFilm(state: Runtime) {
  const shared = ["s2FirstFilm", "s2SecondFilm", "s3Film-dec04", "s3Film-dec22", "s3Film-jan08", "s45LastFilm"]
    .map(key => String(state.variables[key] || ""));
  return shared.some(id => Boolean(HISTORICAL_FILM_TITLES[id]) && state.variables["filmStatus-" + id] === "unfinished");
}
// Deleted proposals are not reattached. Keep their IDs, history and pending
// replies readable, then bridge only an idle next-date anchor to this revision.
const bridges: Record<string,string> = {
  'rev15-close':'s45-feb05', 'life-nearly':'s45-feb26',
  'life-after-nearly':'s45-mar01', 'life-offer':'s45-mar05',
  'life-yuki-offer':'s45-mar08', 'life-future':'s45-mar20',
  'life-honest-boxes':'s45-apr10-logistics', 'life-quiet-boxes':'s45-apr10-logistics',
  'life-honest-leave':'s45-departure', 'life-quiet-leave':'s45-departure',
};
export function migrateStage45(work: Work, saved: Runtime, sourceRevision = saved.revision): Runtime {
  if(work.variables.stage45Revision!==1) return saved;
  const state=structuredClone(saved);
  if(sourceRevision<=31 && work.nodes.some(n=>n.id==='s32-reunion-lock-gap') &&
     state.variables.s45ReunionStarted===true && !state.variables.s32ReunionDate)
    state.variables.s32ReunionDate=(state.date||'')>='2032-01-01'?state.date!:'2032-09-16';
  if (sourceRevision <= 30 && state.unlocked.includes('s45-post-nearly') && !state.variables.s31NearPostDate)
    state.variables.s31NearPostDate = '2027-02-26';
  if(work.nodes.some(n=>n.id==='s29-jan18-apply') && !state.choices.length && !state.scheduled?.length &&
    !state.endings.length && !state.variables.sideBusy && state.variables.pendingScene==='s3-jan19-friends' &&
    (state.date||'')<'2027-01-18' && !state.variables.s31ApplicationTold)
    state.variables.pendingScene='s29-jan18-apply';
  unlockStage45Media(work,state);
  migrateLatePolish(work,state);
  if (work.variables.stage45LengthRevision === 1 && work.nodes.some(n => n.id === 's29-game-r1') && !state.endings.length &&
      !state.choices.length && !state.scheduled?.length && !state.variables.sideBusy) {
    const pending = state.variables.pendingScene, date = state.date || '';
    // Add quiet company only at a still-future idle anchor. An old in-flight
    // reply or an already played company scene keeps its history and choices.
    if (work.nodes.some(n => n.id === 's29-feb15-quiet') &&
        pending === 's29-feb19-before' && date < '2027-02-15' &&
        state.completed.some(id => /^s29-game-r3-send-[12]-finish$/.test(id)) &&
        !state.completed.includes('s29-feb15-quiet') &&
        !state.variables.s29QuietCompleted && !state.unlocked.includes('s45-post-company')) {
      state.variables.pendingScene = 's29-feb15-quiet';
    }
    if (pending === 's45-feb19' && date <= '2027-02-19' && !state.variables.s29YukiDinnerTold &&
        !state.completed.includes('s45-feb19')) state.variables.pendingScene = 's29-feb19-before';
    if (pending === 's45-mar20' && date < '2027-03-14' && !state.completed.includes('s29-mar14')) state.variables.pendingScene = 's29-mar14';
    if (pending === 's28-apr05' && date <= '2027-03-28' && state.variables.s45Ride2 === true &&
        state.unlocked.includes('s45-ig-owner-ride2') && !state.completed.includes('s29-mar28')) state.variables.pendingScene = 's29-mar28';
    if (pending === 's45-apr10-logistics' && typeof state.variables.s28RamenDate === 'string' &&
        date < state.variables.s28RamenDate && !state.variables.s29MealFinished) {
      state.variables.pendingScene = state.variables.s28RamenDate === '2027-04-08' ? 's29-apr08-after' : 's29-apr06-after';
    }
  }
  // A newly entered core-read stop has no pending date until its actual read.
  // Already-past r28 saves do not acquire this new prerequisite retroactively.
  // The B-only departure record is additive and never chooses/replays a route.
  if (work.data.threads.some(i => i.id === 's29-post-no-hug') &&
      state.variables.s45Route === 'B' && state.variables.s45Departed === true &&
      !state.unlocked.includes('s29-post-no-hug')) {
    state.unlocked.push('s29-post-no-hug');
    state.variables['postDate-s29-post-no-hug'] = String(state.variables.s45MoveDate || state.date || '');
    state.variables['postTime-s29-post-no-hug'] = '09:00';
  }
  const first=firstSharedFilm(state);
  state.notifications=state.notifications.map(text=>text
    .replace('今晚再看一次《片名》？',first ? `今晚再看一次《${HISTORICAL_FILM_TITLES[first]}》？` : '今晚再看一次最初那部電影？')
    .replace('我們好像還有一部電影沒看完',state.variables.s45ReunionStarted && !state.variables.s45ReunionUnfinished ? '好久沒跟你一起看電影了' : '我們好像還有一部電影沒看完'));
  if (saved.variables.stage45MigrationRevision !== 1 && (state.variables.s2FirstFilm || state.completed.includes("life-film1-pick-send-1") || state.completed.includes("life-film1-pick-send-2"))) state.variables.s45LegacyFirstPair=true;
  if (saved.variables.stage45MigrationRevision !== 1 && !state.completed.includes("life-film1-pick-send-2") && (state.choices.some(c=>c.target==="life-film1-pick-send-2") || state.ui?.messages?.replyDraft === "life-film1-pick-send-2")) { state.variables.s45LegacyFirstChoice=true; state.variables.s45LegacyFirstPair=true; }
  if(!state.variables.s2FirstFilm) {
    if(state.completed.includes('life-film1-pick-send-1')) state.variables.s2FirstFilm='spring';
    else if(state.completed.includes('life-film1-pick-send-2')) state.variables.s2FirstFilm=saved.revision<=25?'chungking':'mood';
  }
  // Completed endings remain exactly as played. No retroactive A/B decisions,
  // posts, movie completions, or compulsory replay of the revised ending.
  if(state.endings.length) return state;
  const legacy = saved.variables.stage45MigrationRevision !== 1 || state.variables.s45LegacyInFlight === true;
  if (legacy && (state.choices.length || state.scheduled?.length || (state.date || "") >= "2027-02-01")) state.variables.s45LegacyInFlight = true;
  const idle=!state.choices.length&&!state.scheduled?.length&&!state.variables.sideBusy;
  const old=String(state.variables.pendingScene||'');
  let target=legacy ? bridges[old] : undefined;
  if(!old && idle && state.variables.s3ReviewComplete && !state.completed.includes('s45-jan28') && (!state.date || state.date<='2027-01-28')) target='s45-jan28';
  if(target&&idle) {
    // Old chosen routes survive. They do not have to answer a different late
    // confession on import, and are not manufactured from an unchosen draft.
    if(state.variables.lifeRoute==='honest') { state.variables.s45Route='A'; state.variables.s45LegacyRoute=true; }
    if(state.variables.lifeRoute==='quiet') { state.variables.s45Route='B'; state.variables.s45LegacyRoute=true; }
    if (state.variables.s45LegacyRoute && ["s45-apr08-film", "s45-apr08-after"].includes(target)) target="s45-departure";
    const floor=state.date||'';
    if(lateSceneDates[target]<floor) {
      target=Object.keys(lateSceneDates).sort((a,b)=>lateSceneDates[a].localeCompare(lateSceneDates[b])).find(id=>lateSceneDates[id]>=floor&&!state.completed.includes(id))||'';
    }
    if (state.variables.s45LegacyRoute && ["s45-apr08-film", "s45-apr08-after"].includes(target)) target="s45-departure";
    if(target) {
      state.variables.pendingScene=target;
      state.variables.s3PreviewPaused=false;
      state.variables.releaseComplete=false;
    }
  }
  state.variables.stage45MigrationRevision=1;
  return state;
}
