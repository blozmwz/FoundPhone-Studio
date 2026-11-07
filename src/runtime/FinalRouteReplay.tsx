import { useEndingMusic } from './BackgroundMusic';
import { useState } from 'react';
import { advance,choose,dispatch } from '../engine';
import type { Runtime,Work } from '../schema';
import { db,persistRuntime,preserveMigrationBackup } from '../persistence';
import { chapterCheckpoint,housingCheckpoint } from './checkpoint';
import { lifeInteraction } from './lifeInteractions';
import { pendingScene } from './scenePacing';
import { storyContinuation } from './continuation';
import { journeyOf,mergeJourney } from './journeyProgress';
import { restoreRuntime } from './saveMigration';
export function atFinalFork(s:Runtime){return s.choices.some(c=>c.target==='s28-main-choice-send-1');}
export async function captureFinalFork(scope:string,s:Runtime){
 if(!atFinalFork(s))return;
 const id=scope+':final-fork';await db.transaction('rw',db.saves,async()=>{if(!await db.saves.get(id))await db.saves.add({id,state:s});});
}
export function reconstructFinalFork(work:Work,previous:Runtime){
 let s=chapterCheckpoint(work,5,previous);
 for(let n=0;n<1200;n++){
  if(atFinalFork(s))return s;
  if(s.scheduled?.length)s=advance(work,s,30000);
  else if(s.choices.length){const c=s.choices.find(c=>previous.completed.includes(c.target))||s.choices[0];s=choose(work,s,c.target);}
  else if(s.variables.s29PhotoReady){s=lifeInteraction(work,s,'selectMealPhoto','s29-photo-meal');s=lifeInteraction(work,s,'mealPhotoSent','s29-photo-meal');}
  else if(pendingScene(work,s))s=dispatch(work,s,'continueScene',pendingScene(work,s)!.id);
  else {const next=storyContinuation(work,s);if(!next)throw Error('未找到安全的最终分岔入口');s=dispatch(work,s,'read',next.item.id);}
 }
 throw Error('最终分岔入口未接通');
}
// Exported backups may retain completion records without the per-device archive.
// Rebuild only an already achieved route through the engine, never copy the other
// ending's unlocked records or private branch messages into its review.
export function archivedEndingStart(work:Work,route:'A'|'B'|'early',previous:Runtime):Runtime {
 let s=route==='early'?housingCheckpoint(work,previous):reconstructFinalFork(work,previous);
 const major=route==='early'?'choose-house-decline':'s28-main-choice-send-'+(route==='A'?1:2);
 for(let n=0;n<1200;n++){
  if(s.endings.length)return s;
  if(s.scheduled?.length)s=advance(work,s,30000);
  else if(s.choices.length)s=choose(work,s,s.choices.find(c=>c.target===major)?.target||s.choices.find(c=>previous.completed.includes(c.target))?.target||s.choices[0].target);
  else if(s.variables.s28CanLock===true)s=dispatch(work,s,'endingPhoneLocked',String(s.variables.s28EndingPending));
  else if(pendingScene(work,s))s=dispatch(work,s,'continueScene',pendingScene(work,s)!.id);
  else{const next=storyContinuation(work,s);if(!next)throw Error('已完成结局的回看未接通');s=dispatch(work,s,'read',next.item.id);}
 }
 throw Error('已完成结局的回看未能恢复');
}
export function archivedReunionStart(work:Work,previous:Runtime):Runtime {
 let s=lifeInteraction(work,archivedEndingStart(work,'B',previous),'reunionLock','quiet');
 for(let n=0;n<100;n++){
  if(s.variables.s45ReunionComplete===true&&!s.scheduled?.length)return s;
  if(s.scheduled?.length)s=advance(work,s,30000);
  else if(s.choices.length)s=choose(work,s,s.choices.find(c=>previous.completed.includes(c.target))?.target||s.choices[0].target);
  else {const id=['s45-reunion-open-3','s45-reunion-invite-2'].find(id=>s.unlocked.includes(id)&&!s.read.includes(id));if(!id)throw Error('彩蛋回看未接通');s=dispatch(work,s,'read',id);}
 }
 throw Error('彩蛋回看未能恢复');
}
export function otherFinalFork(start:Runtime,current:Runtime):Runtime {
 const target='s28-main-choice-send-2';
 if(!atFinalFork(start))throw Error('不是最终心意分岔');
 return {...start,variables:{...start.variables,s32OtherChoiceOnly:true},
  choices:start.choices.filter(c=>c.target===target),
  ui:{...start.ui,progress:mergeJourney(journeyOf(current),journeyOf(start)),messages:{...start.ui?.messages,replyDraft:''}}};
}
export function FinalRouteReplay({work,state,scope,normalScope,onReplay}:{work:Work;state:Runtime;scope:string;normalScope:string;onReplay?:(scope:string)=>void}){
 const music=useEndingMusic();
 const[error,setError]=useState(''),[busy,setBusy]=useState(false);
 if(!onReplay||state.variables.s45Ending!=='A')return null;
 async function begin(){setBusy(true);setError('');try{
  await music?.stopEndingCue();
  await persistRuntime(scope,state);await preserveMigrationBackup(scope,state,work.updatedAt,work.phone.owner);
  const old=await db.saves.get(scope+':final-fork');
  const start=old?restoreRuntime(work,old.state):reconstructFinalFork(work,state);
  const target=normalScope+':chapter-replay:other-thursday';
  const next=otherFinalFork(start,state);
  next.ui={...next.ui,profile:{...next.ui?.profile,playerName:work.phone.owner}};
  await persistRuntime(target,next);await captureFinalFork(target,start);
  localStorage.setItem(normalScope+':chapter-active',target);onReplay!(target);
 }catch{setError('暂时无法返回分岔，原进度已保留。');}finally{setBusy(false);}}
 return <><button disabled={busy} onClick={()=>void begin()}>回到那个礼拜四</button>{error&&<p role="alert">{error}</p>}</>;
}
