import type { Runtime } from '../schema';
import { randomId } from '../browserCrypto';
import { journeyOf, reachedChapter } from './journeyProgress';
export type Metrics={chapter:number;completed:number[];endings:string[];reunion:boolean};
export function metricsOf(state:Runtime):Metrics{
 const progress=journeyOf({...state,ui:{...state.ui,progress:{}}});
 return{chapter:reachedChapter(state),completed:[1,2,3,4,5].filter(n=>progress['chapter:'+n]===true),endings:['early','A','B'].filter(k=>!!progress['ending:'+k]),reunion:progress.reunion===true};
}
export type MetricEvent={id:string;visitor:string;session:string;run:string;mode:'first'|'replay';kind:string;chapter:number;ending:string;build:string;minute?:number;ms?:number};
type Ledger={visitor:string;runs:Record<string,{id:string;seen:string[]}>;queue:MetricEvent[];session:string;last:number;active?:Record<string,number>;acked?:string[]};
const KEY='thursday-anonymous-metrics-v1';
const MAX_QUEUE=64;
/** Analytics owns its own small store. It never writes the game DB or journal. */
export class AnonymousAnalytics{
 private data:Ledger;private run:{id:string;seen:string[]};private pending=false;private stopped=false;
 private before:Metrics;private lastActivity=Date.now();private lastTick=Date.now();private retryAt=0;private failures=0;
 constructor(private scope:string,private build:string,private replay:boolean,initial:Metrics,existing:boolean,private transport:(events:MetricEvent[])=>Promise<boolean>,private storage:Pick<Storage,'getItem'|'setItem'>=localStorage,private now:()=>number=Date.now,visitOnly=false){
  const time=now();let saved:Ledger|undefined;try{saved=JSON.parse(storage.getItem(KEY)||'null') as Ledger|undefined;}catch{/* Metrics may start fresh; game saves are untouched. */}
  this.data=saved&&typeof saved.visitor==='string'&&saved.runs&&Array.isArray(saved.queue)?saved:{visitor:randomId(),runs:{},queue:[],session:randomId(),last:time};
  if(time-this.data.last>1800000)this.data.session=randomId();
  this.data.last=time;
  this.data.queue=this.data.queue.filter(e=>e.kind!=='active'||Math.abs(time-(e.minute||0)*60000)<180000).slice(-MAX_QUEUE);
  const found=this.data.runs[scope];this.run=found||{id:randomId(),seen:[]};this.data.runs[scope]=this.run;
  this.before=initial;this.lastActivity=time;this.lastTick=time;
  if(visitOnly)this.add('view',0,'',false);
  else if(!this.run.seen.some(k=>k.startsWith('start:')||k.startsWith('resume:'))){this.add(existing?'resume':'start',initial.chapter);this.add('chapter_reach',initial.chapter);}
  this.persist();
 }
 private persist(){try{
  const latest=JSON.parse(this.storage.getItem(KEY)||'null') as Ledger|null;
  if(latest&&latest.visitor===this.data.visitor){
   this.data.acked=[...new Set([...(latest.acked||[]),...(this.data.acked||[])])].slice(-256);
   const acked=new Set(this.data.acked),queue=new Map<string,MetricEvent>();
   for(const e of [...(latest.queue||[]),...this.data.queue])if(!acked.has(e.id)){const old=queue.get(e.id);queue.set(e.id,old&&e.kind==='active'&&old.ms!>e.ms!?old:e);}
   this.data.queue=[...queue.values()].filter(e=>e.kind!=='active'||Math.abs(this.now()/60000-(e.minute||0))<=3).slice(-MAX_QUEUE);
   for(const[k,r]of Object.entries(latest.runs||{})){const own=this.data.runs[k];if(!own)this.data.runs[k]=r;else if(own.id===r.id)own.seen=[...new Set([...r.seen,...own.seen])];else this.data.runs[k]=r;}
  }
  this.storage.setItem(KEY,JSON.stringify(this.data));
 }catch{/* Quota/disabled storage never affects game. */}}
 private add(kind:string,chapter=0,ending='',once=true,extra:Partial<MetricEvent>={}){
  const key=[kind,chapter,ending].join(':');if(once&&this.run.seen.includes(key))return;
  if(once)this.run.seen.push(key);
  this.data.queue.push({id:randomId(),visitor:this.data.visitor,session:this.data.session,run:this.run.id,mode:this.replay?'replay':'first',kind,chapter,ending,build:this.build,...extra});
  if(this.data.queue.length>MAX_QUEUE){const heartbeat=this.data.queue.findIndex(e=>e.kind==='active');this.data.queue.splice(heartbeat<0?0:heartbeat,1);}
  this.persist();
 }
 observe(next:Metrics){
  if(this.stopped)return;
  if(next.chapter!==this.before.chapter)this.add('chapter_reach',next.chapter);
  for(const n of next.completed)if(!this.before.completed.includes(n))this.add('chapter_complete',n);
  for(const ending of next.endings)if(!this.before.endings.includes(ending))this.add('ending',next.chapter,ending);
  if(next.reunion&&!this.before.reunion)this.add('reunion',5);
  this.before=next;
 }
 activity(){const time=this.now();if(time-this.data.last>1800000)this.data.session=randomId();this.lastActivity=time;this.data.last=time;}
 tick(visible:boolean){
  const time=this.now(),from=this.lastTick;this.lastTick=time;
  if(!visible||this.stopped)return;
  const end=Math.min(time,this.lastActivity+60000);if(end<=from)return;
  // Split at wall-clock minute boundaries. Maximum over tabs per visitor/minute
  // is applied at the server; retries cannot inflate cumulative bucket values.
  this.data.active||={};
  for(let pos=from;pos<end;){const minute=Math.floor(pos/60000),stop=Math.min(end,(minute+1)*60000),key=String(minute);const ms=Math.min(60000,(this.data.active[key]||0)+Math.min(15000,stop-pos));this.data.active[key]=ms;const queued=this.data.queue.find(e=>e.kind==='active'&&e.minute===minute);if(queued)queued.ms=ms;else this.add('active',this.before.chapter,'',false,{minute,ms});pos=stop;}
  for(const k of Object.keys(this.data.active))if(Number(k)<Math.floor(time/60000)-3)delete this.data.active[k];
  this.persist();
 }
 async flush(){
  if(this.pending||this.stopped||this.now()<this.retryAt||!this.data.queue.length)return;
  this.data.queue=this.data.queue.filter(e=>e.kind!=='active'||Math.abs(this.now()/60000-(e.minute||0))<=2);
  this.pending=true;const batch=this.data.queue.slice(0,12).map(e=>({...e}));if(!batch.length){this.pending=false;this.persist();return;}
  try{if(!await this.transport(batch))throw Error('offline');const ids=new Set(batch.map(e=>e.id));const newer=this.data.queue.filter(e=>ids.has(e.id)&&e.kind==='active'&&batch.find(b=>b.id===e.id)!.ms!==e.ms);for(const e of newer){e.id=randomId();ids.delete(e.id);}
   this.data.acked=[...(this.data.acked||[]),...batch.map(e=>e.id)].slice(-256);this.data.queue=this.data.queue.filter(e=>!ids.has(e.id));this.failures=0;this.persist();}
  catch{this.retryAt=this.now()+Math.min(60000,5000*2**Math.min(4,this.failures++));}
  finally{this.pending=false;}
 }
 stop(){this.stopped=true;this.persist();}
}

/** Called only for an explicit independent replay, never on reload/resume. */
export function rotateAnonymousRun(scope:string){
 if(import.meta.env.VITE_ANONYMOUS_ANALYTICS!=='1')return;
 try{const data=JSON.parse(localStorage.getItem(KEY)||'null') as Ledger|null;if(data?.runs){data.runs[scope]={id:randomId(),seen:[]};localStorage.setItem(KEY,JSON.stringify(data));}}catch{/* Does not touch game saves. */}
}
