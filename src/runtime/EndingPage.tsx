import { useEndingMusic } from './BackgroundMusic';
import { useEffect,useRef,useState,type ReactNode } from 'react';
export function EndingPage({body,route,read,onRead,onFinish,onReunion,other}:{body:string;route:'A'|'B';read:boolean;onRead:()=>void;onFinish:()=>void;onReunion:()=>void;other:ReactNode}){
 const music=useEndingMusic();
 const root=useRef<HTMLDivElement>(null),end=useRef<HTMLSpanElement>(null),callback=useRef(onRead);callback.current=onRead;
 const[ready,setReady]=useState(read);
 useEffect(()=>{if(read){setReady(true);return;}const target=end.current;if(!target)return;let timer:ReturnType<typeof setTimeout>|undefined;
  const observer=new IntersectionObserver(entries=>{clearTimeout(timer);if(entries.some(e=>e.isIntersecting))timer=setTimeout(()=>{setReady(true);callback.current();},1700);},{root:root.current,threshold:1});
  observer.observe(target);return()=>{observer.disconnect();clearTimeout(timer);};
 },[read]);
 const [title,...lines]=body.split('\n');
 return <div ref={root} className="story-overlay ending late-ending" role="region" aria-label={title}>
  <h2>{title}</h2><div className="ending-paragraphs">{lines.join('\n').trim().split('\n\n').map((text,i)=><p key={i} style={{animationDelay:`${i*140}ms`}}>{text}</p>)}</div>
  <span ref={end} className="ending-read-marker" aria-hidden="true"/>
  <div className="ending-actions" aria-live="polite">{ready&&(route==='A'?<><button onClick={onFinish}>结束</button>{other}</>:<>
   <p className="ending-open-question">那些没有说出口的话，<br/>还会等到下一个礼拜四吗？</p>
   <button onClick={()=>{void (async()=>{await music?.stopEndingCue();onReunion();})();}}>也许还会</button><button onClick={onFinish}>就到这里吧</button>
  </>)}</div>
 </div>;
}
