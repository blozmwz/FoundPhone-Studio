import { useEffect, useRef } from 'react';
import type { Runtime,Work } from '../schema';
import { AnonymousAnalytics, metricsOf, type MetricEvent } from './anonymousAnalytics';
const OPTED_OUT=()=>navigator.doNotTrack==='1'||(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl===true;
let config:Promise<boolean>|undefined;
async function send(events:MetricEvent[]){const response=await fetch('/api/analytics/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events}),keepalive:true,signal:AbortSignal.timeout(4000)});return response.ok;}
export function beginAnonymousVisit(work:Work){
 if(import.meta.env.VITE_ANONYMOUS_ANALYTICS!=='1'||OPTED_OUT())return Promise.resolve(false);
 config||=(async()=>{try{
  const response=await fetch('/api/analytics/config',{cache:'no-store',signal:AbortSignal.timeout(3000)});
  if(!response.ok||!(await response.json()).enabled)return false;
  const visit=new AnonymousAnalytics('page',String(work.variables.releaseBuild||work.updatedAt),false,{chapter:0,completed:[],endings:[],reunion:false},false,send,localStorage,Date.now,true);
  await visit.flush();visit.stop();return true;
 }catch{return false;}})();
 return config;
}
export function useAnonymousAnalytics(work:Work,state:Runtime,ready:boolean,scope:string,normalScope:string,existing:boolean,disabled:boolean){
 const current=useRef(state);current.current=state;
 const tracker=useRef<AnonymousAnalytics|null>(null);
 useEffect(()=>{
  if(disabled||!ready)return;
  let live=true;let stop:()=>void=()=>{};const baseline=current.current;
  void beginAnonymousVisit(work).then(enabled=>{
   if(!live||!enabled)return;
   try{
    const t=new AnonymousAnalytics(scope,String(work.variables.releaseBuild||work.updatedAt),scope!==normalScope,metricsOf(baseline),existing,send);tracker.current=t;t.observe(metricsOf(current.current));
    let visible=document.visibilityState==='visible',lastFlush=0;
    const active=()=>t.activity(),visibility=()=>{t.tick(visible);visible=document.visibilityState==='visible';void t.flush();},tick=()=>{t.tick(visible);if(Date.now()-lastFlush>=30000){lastFlush=Date.now();void t.flush();}},leave=()=>{t.tick(visible);void t.flush();};
    const events=['pointerdown','touchstart','keydown','scroll'] as const;
    for(const name of events)document.addEventListener(name,active,{passive:true,capture:true});
    document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',leave);
    const timer=setInterval(tick,5000);void t.flush();
    stop=()=>{clearInterval(timer);for(const name of events)document.removeEventListener(name,active,true);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',leave);t.tick(visible);void t.flush();t.stop();tracker.current=null;};
   }catch{/* Restricted storage/network must never block play or saving. */}
  });
  return()=>{live=false;stop();};
 },[work,ready,scope,normalScope,existing,disabled]);
 useEffect(()=>{try{tracker.current?.observe(metricsOf(state));}catch{/* Analytics is best effort. */}},[state]);
}
