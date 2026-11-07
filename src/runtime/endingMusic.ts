export const ENDING_TRACK='thu-37b6c37de9ce';
export const ENDING_CLIP_KEY='thursday-ending-clip-review-v2';
export type EndingClip={track:string;start:number;end:number|null};
// Latest author decision: play from the beginning. Ignore the retired 52s audition key.
export const CONFIRMED_ENDING_CLIP:EndingClip={track:ENDING_TRACK,start:0,end:null};
export function endingClip(value:unknown,duration=Infinity):EndingClip|null{
 if(!value||typeof value!=='object')return null;
 const c=value as Record<string,unknown>,end=c.end??null;
 return c.track===ENDING_TRACK&&typeof c.start==='number'&&Number.isFinite(c.start)&&c.start>=0&&c.start<duration&&
   (end===null||typeof end==='number'&&Number.isFinite(end)&&end-c.start>=.5&&end<=duration)?{track:ENDING_TRACK,start:c.start,end}:null;
}
export function readEndingClip(){try{return endingClip({...JSON.parse(localStorage.getItem(ENDING_CLIP_KEY)||'null'),start:0})||CONFIRMED_ENDING_CLIP;}catch{return CONFIRMED_ENDING_CLIP;}}
export function musicSilenced(fallback=false){try{const v=localStorage.getItem('thursday-music-silenced');return v===null?fallback:v==='true';}catch{return fallback;}}
export function rememberMusicSilenced(value:boolean){try{localStorage.setItem('thursday-music-silenced',String(value));}catch{/* the save still keeps this preference */}}
// Both tracks use the same Web Audio clock; HTML volume is a fallback only.
export class MusicFader{
 private context:AudioContext|null=null;
 private gains=new Map<HTMLMediaElement,GainNode>();
 private sources=new Map<HTMLMediaElement,MediaElementAudioSourceNode>();
 private analysers=new Map<HTMLMediaElement,AnalyserNode>();
 private resuming:Promise<void>=Promise.resolve();
 private frames=new Map<HTMLMediaElement,number>();
 unlock(){
  // On supported Safari versions explicitly request a music playback session.
  // Feature-detected: it is not a replacement for a real user activation.
  try{const session=(navigator as Navigator & {audioSession?:{type:string}}).audioSession;if(session)session.type='playback';}catch{/* Optional platform API. */}
  try{this.context??=new AudioContext();this.resuming=this.context.resume();void this.resuming.catch(()=>{});}catch{/* HTML volume fallback */}
 }
 async ready(){await this.resuming;if(this.context&&this.context.state!=='running')throw Error('Audio context suspended');}
 forget(el:HTMLMediaElement){cancelAnimationFrame(this.frames.get(el)||0);this.frames.delete(el);this.gains.get(el)?.disconnect();this.gains.delete(el);this.analysers.get(el)?.disconnect();this.analysers.delete(el);this.sources.get(el)?.disconnect();this.sources.delete(el);}
 private gain(el:HTMLMediaElement){
  if(!this.context)return null;
  let gain=this.gains.get(el);if(!gain){try{gain=this.context.createGain();gain.gain.value=el.volume;const source=this.context.createMediaElementSource(el),analyser=this.context.createAnalyser();analyser.fftSize=1024;source.connect(gain).connect(analyser).connect(this.context.destination);this.analysers.set(el,analyser);this.sources.set(el,source);this.gains.set(el,gain);el.volume=1;}catch{return null;}}
  return gain;
 }
 signal(el:HTMLMediaElement){const analyser=this.analysers.get(el);let level=0;if(analyser){const values=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(values);for(const v of values)level+=v*v;level=Math.sqrt(level/values.length);}return{available:!!analyser,level,context:this.context?.state||'native',gain:this.gains.get(el)?.gain.value??el.volume};}
 set(el:HTMLMediaElement|null,value:number){if(!el)return;cancelAnimationFrame(this.frames.get(el)||0);const g=this.gain(el);if(g&&this.context){g.gain.cancelScheduledValues(this.context.currentTime);g.gain.setValueAtTime(value,this.context.currentTime);}else el.volume=value;}
 fade(el:HTMLMediaElement|null,value:number,ms:number){
  if(!el)return;cancelAnimationFrame(this.frames.get(el)||0);const g=this.gain(el);
  if(g&&this.context){const t=this.context.currentTime;g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(g.gain.value,t);g.gain.linearRampToValueAtTime(value,t+ms/1000);return;}
  const from=el.volume,start=performance.now();const tick=()=>{const f=Math.min(1,(performance.now()-start)/ms);el.volume=from+(value-from)*f;if(f<1)this.frames.set(el,requestAnimationFrame(tick));};tick();
 }
 dispose(){for(const f of this.frames.values())cancelAnimationFrame(f);this.frames.clear();for(const g of this.gains.values())g.disconnect();this.gains.clear();for(const a of this.analysers.values())a.disconnect();this.analysers.clear();for(const source of this.sources.values())source.disconnect();this.sources.clear();void this.context?.close().catch(()=>{});}
}
