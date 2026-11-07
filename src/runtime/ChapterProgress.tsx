import { useEffect, useState } from 'react';
import type { Runtime, Work } from '../schema';
import { db, persistRuntime, preserveMigrationBackup, readSavedRuntime } from '../persistence';
import { chapterCheckpoint } from './checkpoint';
import { restoreRuntime } from './saveMigration';
import { advance,choose,dispatch } from '../engine';
import { pendingScene } from './scenePacing';
import { storyContinuation } from './continuation';
import{archivedEndingStart,archivedReunionStart}from'./FinalRouteReplay';
import {chapterNames,endingNames,reachedChapter,journeyOf,mergeJourney,type EndingKey}from'./journeyProgress';
export {reachedChapter}from'./journeyProgress';
export async function captureChapter(scope:string,state:Runtime,replay=false){
 const n=reachedChapter(state),progress=journeyOf(state);
 await db.transaction('rw',db.saves,async()=>{
  if(!await db.saves.get(scope+':chapter:'+n))await db.saves.add({id:scope+':chapter:'+n,state});
  for(const route of Object.keys(endingNames) as EndingKey[]){
   if(state.endings.some(e=>e===progress['ending:'+route])&&!await db.saves.get(scope+':ending:'+route))await db.saves.add({id:scope+':ending:'+route,state});
  }
  if(progress.reunion===true&&!await db.saves.get(scope+':reunion'))await db.saves.add({id:scope+':reunion',state});
  if(replay){const old=await db.saves.get(scope);if(old)await db.saves.put({...old,state:{...old.state,ui:{...old.state.ui,progress:mergeJourney(journeyOf(old.state),progress)}}});}
 });
}
export function chapterReplayStart(work:Work,n:number,previous:Runtime){
 let s=chapterCheckpoint(work,n,previous);
 if(n===2)for(let i=0;i<400&&s.variables.pendingScene!=='s2-accidental';i++){
  if(s.scheduled?.length)s=advance(work,s,30000);
  else if(s.choices.length)s=choose(work,s,s.choices.find(c=>previous.completed.includes(c.target))?.target||s.choices[0].target);
  else if(pendingScene(work,s))s=dispatch(work,s,'continueScene',pendingScene(work,s)!.id);
  else{const next=storyContinuation(work,s);if(!next)throw Error('章节起点未接通');s=dispatch(work,s,'read',next.item.id);}
 }
 const start=pendingScene(work,s);return n>1&&start?dispatch(work,s,'continueScene',start.id):s;
}
export function ChapterProgress({work,state,scope,normalScope,replay,onReplay}:{work:Work;state:Runtime;scope:string;normalScope:string;replay:boolean;onReplay:(scope:string)=>void}){
 const[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[origin,setOrigin]=useState<Runtime|null>(null);
 useEffect(()=>{if(!show)return;let live=true;void readSavedRuntime(normalScope).then(row=>{if(live)setOrigin(row?.state||state);});return()=>{live=false;};},[show,normalScope,state]);
 if(work.id!=='fridge-light-roommates')return null;
 const current=origin||state,max=reachedChapter(current),progress=mergeJourney(journeyOf(current),journeyOf(state));
 const entered=(n:number)=>n<=max||progress['entered:'+n]===true;
 async function openReplay(id:string,start:Runtime){
  const target=normalScope+':chapter-replay:'+id;
  await persistRuntime(scope,state);await preserveMigrationBackup(scope,state,work.updatedAt,work.phone.owner);
  await persistRuntime(target,{...start,ui:{...start.ui,progress:mergeJourney(progress,journeyOf(start)),profile:{...start.ui?.profile,playerName:work.phone.owner}}});
  localStorage.setItem(normalScope+':chapter-active',target);onReplay(target);
 }
 async function chapter(n:number){if(progress['chapter:'+n]!==true||busy)return;if(!confirm('从「'+chapterNames[n-1]+'」开始独立重玩？原进度会保留。'))return;setBusy(true);setError('');try{
  const row=await db.saves.get(normalScope+':chapter:'+n);await openReplay(String(n),row&&reachedChapter(row.state)===n?restoreRuntime(work,row.state):chapterReplayStart(work,n,current));
 }catch{setError('未能打开独立重玩，原进度已保留。');}finally{setBusy(false);}}
 async function ending(route:EndingKey|'reunion'){setBusy(true);setError('');try{
  if(route==='reunion'&&progress.reunion!==true)return;
  if(route!=='reunion'&&typeof progress['ending:'+route]!=='string')return;
  const row=await db.saves.get(normalScope+(route==='reunion'?':reunion':':ending:'+route));
  const start=row?restoreRuntime(work,row.state):route==='reunion'?archivedReunionStart(work,current):archivedEndingStart(work,route,current);
  if(!row&&route!=='reunion'){
   start.endings=[String(progress['ending:'+route])];
  }
  start.ui={...start.ui,messages:{...start.ui?.messages,reunionEndCard:false,titleOpen:false,finalPhase:'',endingPhase:route==='reunion'?'reunion':'reading',reunionOpen:route==='reunion',reviewReunion:route==='reunion'}};
  await openReplay('view-'+route,start);
 }catch{setError('回看未能打开，原进度已保留。');}finally{setBusy(false);}}
 return <section className="chapter-tools"><p>{replay?(state.ui?.playthrough?.kind==='new-game'?"独立新周目":"当前重玩"):"当前进度"}：第{replay?reachedChapter(state):max}章／共5章</p><button onClick={()=>setShow(!show)}>章节重玩</button>{show&&<>
  <p>已完成的章节可以独立重玩；当前章节从自动存档继续。</p>
  {chapterNames.map((name,i)=><button key={i} disabled={busy||progress['chapter:'+(i+1)]!==true} onClick={()=>void chapter(i+1)}>
   第{i+1}章 · {entered(i+1)?name:'未解锁'}{progress['chapter:'+(i+1)]===true?' · 重玩':i+1===max?' · 进行中':''}
  </button>)}
  {(Object.keys(endingNames) as EndingKey[]).filter(k=>typeof progress['ending:'+k]==='string').map(k=><button key={k} disabled={busy} onClick={()=>void ending(k)}>回看 · {endingNames[k]}</button>)}
  {progress.reunion===true&&<button disabled={busy} onClick={()=>void ending('reunion')}>回看 · 下一个礼拜四</button>}
  {replay&&<button onClick={()=>{localStorage.removeItem(normalScope+':chapter-active');onReplay(normalScope);}}>返回原进度</button>}
  {error&&<p role="alert">{error}</p>}
 </>}</section>;
}
