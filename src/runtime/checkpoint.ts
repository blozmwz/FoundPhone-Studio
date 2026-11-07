import { advance, choose, dispatch } from "../engine";
import { initialRuntime, type Work, type Runtime } from "../schema";
import { storyContinuation } from "./continuation";
import { lifeInteraction } from "./lifeInteractions";
import { pendingScene } from "./scenePacing";

export function viewingCheckpoint(work: Work): Runtime {
  if (work.id !== "fridge-light-roommates")
    throw Error("此作品没有看房试玩节点");
  let state = dispatch(work, initialRuntime(work), "start");
  for (let turn = 0; turn < 160; turn++) {
    state = advance(work, state, 120000);
    if (state.choices.some((c) => c.target === "viewing-arrival-send-1")) {
      return { ...state, notifications: [] };
    }
    if (state.choices.length) {
      state = choose(work, state, state.choices[0].target);
    } else if (pendingScene(work, state)) {
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    } else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("看房试玩节点未能到达");
}

export function roommateCheckpoint(work: Work): Runtime {
  let state = viewingCheckpoint(work);
  for (let turn = 0; turn < 140; turn++) {
    state = advance(work, state, 120000);
    if (state.choices.some((c) => c.target === "life-arrived-send-1"))
      return { ...state, notifications: [] };
    if (state.choices.length) {
      state = choose(
        work,
        state,
        state.choices.find((c) => c.target === "choose-house-stay")?.target ??
          state.choices[0].target,
      );
    } else if (pendingScene(work, state)) {
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    } else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("入住试玩节点未能到达");
}

export function stage2Checkpoint(work: Work): Runtime {
  let state = roommateCheckpoint(work);
  for (let turn = 0; turn < 100; turn++) {
    state = advance(work, state, 120000);
    if (state.variables.pendingScene === "s2-accidental")
      return { ...state, notifications: [] };
    if (state.choices.length)
      state = choose(work, state, state.choices[0].target);
    else if (pendingScene(work, state))
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("Stage 2 试玩节点未能到达");
}

// Start before the last Stage2 choice so the player can personally read the
// final two bubbles, then cross the real date entry into Stage3.
export function stage2TailCheckpoint(work: Work): Runtime {
  let state = stage2Checkpoint(work);
  for (let turn = 0; turn < 240; turn++) {
    state = advance(work, state, 120000);
    if (
      state.choices.some(
        (choice) => choice.target === "s2-film-weekly-reply-send-1",
      )
    )
      return { ...state, notifications: [] };
    if (state.choices.length)
      state = choose(work, state, state.choices[0].target);
    else if (pendingScene(work, state))
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("Stage2 末尾接续节点未能到达");
}

export function stage3Checkpoint(work: Work): Runtime {
  let state = stage2Checkpoint(work);
  for (let turn = 0; turn < 240; turn++) {
    state = advance(work, state, 120000);
    if (state.variables.pendingScene === "s3-dec04")
      return { ...state, notifications: [] };
    if (state.choices.length)
      state = choose(work, state, state.choices[0].target);
    else if (pendingScene(work, state))
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("Stage 3 试玩节点未能到达");
}

export function stage3ReviewState(state: Runtime): Runtime {
  if (!state.variables.s3ReviewComplete || state.endings.length) return state;
  return {
    ...state,
    variables: { ...state.variables, pendingScene: "", s3PreviewPaused: true },
  };
}

export function pizzaCheckpoint(work: Work): Runtime {
  let state = stage2Checkpoint(work);
  for (let turn = 0; turn < 220; turn++) {
    state = advance(work, state, 120000);
    if (
      state.choices.some((choice) => choice.target === "s2-pizza-invite-send-1")
    )
      return { ...state, notifications: [] };
    if (state.choices.length)
      state = choose(work, state, state.choices[0].target);
    else if (pendingScene(work, state))
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("第⑥段披萨试玩节点未能到达");
}

// Local IG review only; replays approved choices into a separate preview save.
export function instagramCheckpoint(work: Work): Runtime {
  let state = stage2Checkpoint(work);
  for (let turn = 0; turn < 220; turn++) {
    state = advance(work, state, 120000);
    if (state.variables.pendingScene === "rev15-outing")
      return { ...state, notifications: [] };
    if (state.choices.length)
      state = choose(work, state, state.choices[0].target);
    else if (pendingScene(work, state))
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("Instagram 试玩节点未能到达");
}

// Replays only the player's already chosen opening options, then stops before
// the major housing decision. Later-route data is never carried across.
export function housingCheckpoint(work: Work, previous: Runtime): Runtime {
  let state = dispatch(work, initialRuntime(work), "start");
  for (let turn = 0; turn < 300; turn++) {
    state = advance(work, state, 120000);
    if (state.choices.some((c) => c.target === "choose-house-stay"))
      return { ...state, notifications: [] };
    if (state.choices.length)
      state = choose(
        work,
        state,
        state.choices.find((c) => previous.completed.includes(c.target))
          ?.target ?? state.choices[0].target,
      );
    else if (pendingScene(work, state))
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("无法恢复入住选择节点，请先导出存档。");
}

// Local review only: advance existing authored events, never manufacture social
// unlocks. Each URL has its own save slot and stops at the Stage3 boundary.
export function stage3MotorCheckpoint(work: Work): Runtime {
  return stage3MediaCheckpoint(work, "s3-dec27");
}
export function stage3RamenCheckpoint(work: Work): Runtime {
  return stage3MediaCheckpoint(work, "s3-ramen-after");
}
function stage3MediaCheckpoint(work: Work, scene: string): Runtime {
  let state = stage3Checkpoint(work);
  for (let turn = 0; turn < 400; turn++) {
    state = advance(work, state, 120000);
    if (
      state.completed.includes(scene) &&
      (scene === "s3-dec27" || state.choices.length)
    )
      return state;
    if (state.choices.length)
      state = choose(work, state, state.choices[0].target);
    else if (pendingScene(work, state))
      state = dispatch(
        work,
        state,
        "continueScene",
        pendingScene(work, state)!.id,
      );
    else if (state.variables.s3LunchOrdering)
      state = lifeInteraction(work, state, "orderFood", "ramen");
    else {
      const next = storyContinuation(work, state);
      if (!next) break;
      state = dispatch(work, state, "read", next.item.id);
    }
  }
  throw Error("Stage3 图片试玩节点未能到达：" + scene);
}

// Replay entry points reproduce the already chosen opening history, never infer
// a different major branch. Real captured chapter snapshots take precedence.
export function chapterCheckpoint(work: Work, chapter: number, previous?: Runtime): Runtime {
  if (chapter === 1) return dispatch(work, initialRuntime(work), 'start');
  const stops: Record<number, (s: Runtime) => boolean> = {
    2: s => Boolean(s.choices.some(c => c.target === 'life-arrived-send-1')),
    3: s => s.variables.pendingScene === 's3-dec04',
    4: s => s.variables.pendingScene === 's45-jan28',
    5: s => s.variables.pendingScene === 's45-mar01',
  };
  let state = dispatch(work, initialRuntime(work), 'start');
  for (let turn=0; turn<1600; turn++) {
    state=advance(work,state,30000);
    if(stops[chapter]?.(state)) return {...state,notifications:[]};
    if(state.scheduled?.length) continue;
    if(state.choices.length) {
      const selected=state.choices.find(c=>previous?.completed.includes(c.target));
      const stay=state.choices.find(c=>c.target==='choose-house-stay');
      state=choose(work,state,selected?.target||stay?.target||state.choices[0].target);
    } else if(pendingScene(work,state)) state=dispatch(work,state,'continueScene',pendingScene(work,state)!.id);
    else {
      const next=storyContinuation(work,state);
      if(!next) throw Error('章节入口未接通：'+chapter+JSON.stringify({date:state.date,pending:state.variables.pendingScene,await:state.variables.s3Awaiting,side:state.variables.sideBusy,end:state.endings,tail:state.completed.slice(-6)}));
      state=dispatch(work,state,'read',next.item.id);
    }
  }
  throw Error('章节入口未能到达');
}
export function stage3TailCheckpoint(work:Work){
 let state=chapterCheckpoint(work,3);
 for(let turn=0;turn<900;turn++) {
  state=advance(work,state,30000);
  if(state.choices.some(c=>c.target==='s3-class-memory-r4-send-1')) return {...state,notifications:[]};
  if(state.scheduled?.length)continue;
  if(state.choices.length) state=choose(work,state,state.choices[0].target);
  else if(pendingScene(work,state)) state=dispatch(work,state,'continueScene',pendingScene(work,state)!.id);
  else {const n=storyContinuation(work,state);if(!n)throw Error('Stage3末尾未能到达');state=dispatch(work,state,'read',n.item.id);}
 }
 throw Error('Stage3末尾未能到达');
}
export function stage4Checkpoint(work:Work){return chapterCheckpoint(work,4);}
export function stage5Checkpoint(work:Work){return chapterCheckpoint(work,5);}
export function stage4WalkCheckpoint(work:Work){
 return chapterCheckpoint(work,4,{...initialRuntime(work),completed:['s3-motor-invite-send-2']});
}

// Local ending review replays the existing engine into a separate checkpoint.
// It never imports a user's save or unlocks arbitrary records.
export function endingCheckpoint(work:Work,route:'A'|'B'|'fork',beforeLock=false):Runtime {
 let state=chapterCheckpoint(work,5);
 for(let i=0;i<1300;i++){
  if(beforeLock && state.variables.s28CanLock===true && !state.scheduled?.length && !state.choices.length)return state;
  if(route==='fork'&&state.choices.some(c=>c.target==='s28-main-choice-send-1'))return state;
  if(state.endings.length)return {...state,ui:{...state.ui,messages:{...state.ui?.messages,endingPhase:'reading'}}};
  if(state.scheduled?.length)state=advance(work,state,30000);
  else if(state.choices.length){const major=state.choices.find(c=>c.target==='s28-main-choice-send-'+(route==='B'?2:1));state=choose(work,state,major?.target||state.choices[0].target);}
  else if(state.variables.s29PhotoReady){state=lifeInteraction(work,state,'selectMealPhoto','s29-photo-meal');state=lifeInteraction(work,state,'mealPhotoSent','s29-photo-meal');}
  else if(state.variables.s28CanLock===true){state=dispatch(work,state,'endingPhoneLocked',String(state.variables.s28EndingPending));}
  else if(pendingScene(work,state))state=dispatch(work,state,'continueScene',pendingScene(work,state)!.id);
  else{const next=storyContinuation(work,state);if(!next)throw Error('结局审阅入口未接通');state=dispatch(work,state,'read',next.item.id);}
 }
 throw Error('结局审阅入口未能到达');
}
export const endingACheckpoint=(w:Work)=>endingCheckpoint(w,'A');
export const endingBCheckpoint=(w:Work)=>endingCheckpoint(w,'B');
export const endingForkCheckpoint=(w:Work)=>endingCheckpoint(w,'fork');

export const endingLockACheckpoint=(w:Work)=>endingCheckpoint(w,'A',true);
export const endingLockBCheckpoint=(w:Work)=>endingCheckpoint(w,'B',true);
export function endingReunionLockCheckpoint(work:Work):Runtime{
 let s=lifeInteraction(work,endingCheckpoint(work,'B'),'reunionLock','quiet');
 s=advance(work,s,30000);s=dispatch(work,s,'read','s45-reunion-open-3');
 s=advance(work,choose(work,s,'s45-reunion-reply-send-1'),30000);
 s=dispatch(work,s,'read','s45-reunion-invite-2');s=advance(work,s,7000);return {...s,ui:{...s.ui,messages:{...s.ui?.messages,endingPhase:'reunion'}}};
}
