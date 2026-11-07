import type { Runtime } from '../schema';
export const chapterNames=['空出来的房间','一起看电影的人','再靠近一点','什么也不做的晚上','下次是什么时候'];
export const endingNames={early:'什么都没有发生',A:'说过以后',B:'无声告别'} as const;
export type EndingKey=keyof typeof endingNames;
export type Journey=Record<string,string|boolean>;
export function reachedChapter(state:Runtime){const d=state.date||'';return d>='2027-03-01'?5:d>='2027-01-28'?4:d>='2026-12-04'?3:d>='2026-09-30'?2:1;}
export function mergeJourney(...values:(Journey|undefined)[]):Journey{
 const result:Journey={};for(const value of values)for(const[key,v]of Object.entries(value||{})){
  if(v===true)result[key]=true;else if(typeof v==='string'&&v&&!result[key])result[key]=v;
 }return result;
}
export function journeyOf(state:Runtime):Journey{
 const out=mergeJourney(state.ui?.progress as Journey|undefined),current=reachedChapter(state);
 for(let n=1;n<=current;n++)out['entered:'+n]=true;
 for(let n=1;n<current;n++)out['chapter:'+n]=true;
 const starts=['s2-accidental','s3-dec04','s45-jan28','s45-mar01'];
 for(let n=1;n<=4;n++)if(state.variables.pendingScene===starts[n-1]&&!state.choices.length&&!state.scheduled?.length)out['chapter:'+n]=true;
 if(state.completed.some(id=>/^s2-film-weekly-reply-send-[12]-finish$/.test(id)))out['chapter:2']=true;
 if(state.variables.s3ReviewComplete===true)out['chapter:3']=true;
 for(const body of state.endings){const route=body.startsWith('说过以后')?'A':body.startsWith('无声告别')?'B':body.includes('什么都没有发生')?'early':'';
  if(route){out['ending:'+route]=out['ending:'+route]||body;out['chapter:'+(route==='early'?1:5)]=true;}}
 if(state.variables.s45ReunionComplete===true &&state.read.includes('s45-reunion-invite-2'))out.reunion=true;
 return out;
}
export function withJourney(state:Runtime):Runtime{return {...state,ui:{...state.ui,progress:journeyOf(state)}};}
