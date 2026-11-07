import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Dexie, { type Table } from 'dexie';
import { ListMusic, Music2, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import type { UiValue } from '../schema';
import { authorMusicManifest, type AuthorMusicManifest } from './authorMusicCatalogue';
import { manuallySelected, musicTime, queueFor, restoredQueue, steppedQueue, type MusicQueue } from './musicQueue';
import { ENDING_TRACK, readEndingClip, MusicFader, musicSilenced, rememberMusicSilenced, type EndingClip } from './endingMusic';
import './late-story.css';
import './music-player.css';
import { randomId, sha256 } from '../browserCrypto';

type Track = { id: string; scope: string; title: string; media: string; artist?: string; cover?: string };
class Library extends Dexie {
  tracks!: Table<Track, string>;
  constructor() { super('thursday-local-music'); this.version(1).stores({ tracks: 'id,scope' }); }
}
const library = new Library();
type Player = {
  tracks: Track[]; selected: string; playing: boolean; time: number; duration: number; volume: number; error: string;
  cueState:string; silenced:boolean; prepareEndingCue:()=>void; startEndingCue:()=>void; stopEndingCue:()=>Promise<void>; silence:()=>void; enableEndingCue:()=>void;
  mode: MusicQueue['mode']; select: (id: string) => void; toggle: () => void; previous: () => void; next: () => void;
  changeMode: () => void; seek: (n: number) => void; setVolume: (n: number) => void; add: (file: File) => Promise<void>;
};
const MusicContext = createContext<Player | null>(null);
const emptyManifest: AuthorMusicManifest = { version: '', tracks: [], retiredIds: [], retiredHashes: [] };
async function obsoleteImported(row: Track, manifest: AuthorMusicManifest) {
  if (manifest.retiredIds.includes(row.id)) return true;
  if (!row.media.startsWith('data:audio/') || !manifest.retiredHashes.length) return false;
  try {
    const bytes = Uint8Array.from(atob(row.media.slice(row.media.indexOf(',') + 1)), c => c.charCodeAt(0));
    const digest = await sha256(bytes);
    return manifest.retiredHashes.includes(digest);
  } catch { return false; }
}
export function BackgroundMusic({ scope, saved, commit, children, endingRoute='', endingVisible=false }: { endingRoute?:string;endingVisible?:boolean;scope: string; saved: Record<string, UiValue>; commit: (key: string, value: UiValue) => void; children: ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null), cueAudio=useRef<HTMLAudioElement>(null), mixer=useRef(new MusicFader());
  const [cueState,setCueState]=useState('idle'),[silenced,setSilenced]=useState(()=>musicSilenced(saved.silenced===true));
  const cueGeneration=useRef(0),cueAttempted=useRef(false),cueFinished=useRef(false),cueStarted=useRef(false),cueActive=useRef(false),cueClip=useRef<EndingClip|null>(null),quiet=useRef(silenced),timers=useRef(new Set<ReturnType<typeof setTimeout>>());
  quiet.current=silenced;
  function later(fn:()=>void,ms:number){const t=setTimeout(()=>{timers.current.delete(t);fn();},ms);timers.current.add(t);}
  function clearCueTimers(){for(const t of timers.current)clearTimeout(t);timers.current.clear();}
  function stopEndingCue():Promise<void>{
    const generation=++cueGeneration.current;clearCueTimers();
    if(!cueActive.current)return Promise.resolve();cueActive.current=false;cueFinished.current=true;mixer.current.fade(cueAudio.current,0,450);
    const a=cueAudio.current;return new Promise(resolve=>setTimeout(()=>{if(generation===cueGeneration.current){a?.pause();setCueState('done');}resolve();},450));
  }
  function silence(){cueGeneration.current++;quiet.current=true;rememberMusicSilenced(true);setSilenced(true);commitRef.current('silenced',true);intent.current=false;clearCueTimers();cueActive.current=false;cueAudio.current?.pause();audio.current?.pause();setCueState('muted');}
  function prepareEndingCue(){
    if(quiet.current)return;const generation=cueGeneration.current;mixer.current.unlock();const a=cueAudio.current;if(!a?.getAttribute('src')||cueActive.current)return;
    mixer.current.set(a,0);void a.play().then(()=>{if(generation===cueGeneration.current&&!cueActive.current){a.pause();try{a.currentTime=0;}catch{/* metadata pending */}}}).catch(()=>{/* Actual ending click will show a retry. */});
  }
  function cueFailed(message:string){cueGeneration.current++;commitRef.current('endingCueError',message);clearCueTimers();cueActive.current=false;cueAudio.current?.pause();setCueState('blocked');}
  function startEndingCue(manual=false,targetVolume=volume){
    const clip=readEndingClip(),a=cueAudio.current;
    if(!['A','B'].includes(endingRoute))return;if(cueFinished.current){if(!manual)return;cueFinished.current=false;cueStarted.current=false;}
    if(cueActive.current&&!manual){mixer.current.unlock();return;}if(cueActive.current){cueActive.current=false;cueAudio.current?.pause();}
    const generation=++cueGeneration.current;clearCueTimers();intent.current=false;mixer.current.unlock();mixer.current.fade(audio.current,0,1000);later(()=>audio.current?.pause(),1000);
    if(!a||quiet.current||targetVolume<=0)return;setCueState('loading');
    if(!a.getAttribute('src')){setCueState('blocked');return;}
    if(a.error||a.networkState===HTMLMediaElement.NETWORK_NO_SOURCE)a.load();
    cueAttempted.current=true;cueClip.current=clip;cueActive.current=true;cueStarted.current=false;mixer.current.set(a,0);
    try{a.currentTime=clip.start;}catch{/* metadata will apply the approved start */}
    // A slider or icon calls play synchronously; direct ending entry also gets
    // one attempt after its source is ready, with a real fallback on rejection.
    later(()=>{if(cueActive.current&&!cueStarted.current)cueFailed('播放未能开始，请点播放图标重试。');},7000);
    void a.play().then(async()=>{
      await mixer.current.ready();
      if(generation!==cueGeneration.current||!cueActive.current)return;setCueState('loading');
      later(()=>{if(generation===cueGeneration.current&&cueActive.current){a.currentTime=clip.start;cueStarted.current=true;mixer.current.fade(a,targetVolume,800);monitorCue(a,endingRoute,generation);}},1000);
    }).catch(()=>{if(generation===cueGeneration.current)cueFailed('浏览器未能播放配乐');});
  }
  function monitorCue(a:HTMLAudioElement,route:string,generation:number){
    const started=a.currentTime,deadline=performance.now()+6500;let heard=false;
    const check=()=>{if(generation!==cueGeneration.current||!cueActive.current||quiet.current)return;const signal=mixer.current.signal(a);a.dataset.signalRms=String(signal.level);a.dataset.outputGain=String(signal.gain);a.dataset.contextState=signal.context;
      if(!heard&&(signal.available?signal.level>.00001:a.currentTime>started+.25)&&!a.paused){heard=true;setCueState('playing');commitRef.current('endingCuePlayed:'+route,true);commitRef.current('endingCueError','');}
      if(!heard&&performance.now()>deadline){cueFailed('没有检测到有效音频，请点播放图标重试。');return;}
      later(check,300);
    };later(check,500);
  }
  function enableEndingCue(){
    quiet.current=false;rememberMusicSilenced(false);setSilenced(false);commitRef.current('silenced',false);
    const gain=volume>0?volume:.5;if(volume<=0){setVolumeState(gain);commitRef.current('volume',gain);}
    const a=cueAudio.current;
    if(a&&cueStarted.current&&!cueFinished.current&&cueClip.current){
      const generation=++cueGeneration.current;clearCueTimers();cueActive.current=true;setCueState('loading');mixer.current.unlock();mixer.current.set(a,0);
      void a.play().then(async()=>{await mixer.current.ready();if(generation===cueGeneration.current&&cueActive.current){mixer.current.fade(a,gain,300);monitorCue(a,endingRoute,generation);}}).catch(()=>{if(generation===cueGeneration.current)cueFailed('浏览器未能恢复配乐');});
    }else startEndingCue(true,gain);
  }
  useEffect(()=>()=>{cueGeneration.current++;cueActive.current=false;clearCueTimers();audio.current?.pause();cueAudio.current?.pause();mixer.current.dispose();},[]);

  const [tracks, setTracks] = useState<Track[]>([]), [selected, setSelected] = useState(String(saved.track || ''));
  const [playing, setPlaying] = useState(false), [time, setTime] = useState(Number(saved.position || 0)), [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(Math.max(0, Math.min(1, Number(saved.volume ?? 0.5)))), [error, setError] = useState('');
  const [queue, setQueue] = useState<MusicQueue>(() => queueFor([], '', saved.mode === 'shuffle' ? 'shuffle' : 'sequential'));
  const intent = useRef(false), resume = useRef(Number(saved.position || 0)), last = useRef(-1);
  const commitRef = useRef(commit), savedRef = useRef(saved), stateRef = useRef({ tracks, selected, queue, playing });
  commitRef.current = commit; savedRef.current = saved; stateRef.current = { tracks, selected, queue, playing };
  function persistQueue(next: MusicQueue) {
    commitRef.current('mode', next.mode); commitRef.current('queue', next.order); commitRef.current('queueIndex', next.cursor);
    commitRef.current('history', next.history); commitRef.current('historyIndex', next.historyCursor);
  }
  function save(force = false) {
    const n = audio.current?.currentTime || 0;
    if (force || Math.abs(n - last.current) > 4) { last.current = n; commitRef.current('position', n); }
  }
  useEffect(() => {
    let active = true;
    const musicBase = import.meta.env.DEV ? '/__author_music/' : import.meta.env.BASE_URL + 'music/';
    const provided = fetch(musicBase + 'manifest.json').then(r => r.ok ? r.json() : null).then(value => authorMusicManifest(value, musicBase)).catch(() => emptyManifest);
    void Promise.all([library.tracks.where('scope').equals(scope).toArray(), provided]).then(async ([rows, manifest]) => {
      const removed = await Promise.all(rows.map(r => obsoleteImported(r, manifest)));
      if (!active) return;
      const retiredRows = rows.filter((_, i) => removed[i]);
      if (retiredRows.length) await library.tracks.bulkDelete(retiredRows.map(r => r.id));
      if (!active) return;
      const loaded = [...manifest.tracks.map(t => ({ ...t, scope })), ...rows.filter((_, i) => !removed[i])];
      const previous = savedRef.current;
      const current = loaded.some(t => t.id === previous.track) ? String(previous.track) : '';
      const reset = Boolean(previous.track) && !current;
      const nextQueue = restoredQueue(loaded.map(t => t.id), current, reset ? { mode: previous.mode } : previous);
      intent.current = false; setPlaying(false); setError(''); setTracks(loaded); setSelected(current); setQueue(nextQueue);
      resume.current = reset ? 0 : Number(previous.position || 0); setTime(resume.current); last.current = -1;
      if (reset) { commitRef.current('track', ''); commitRef.current('position', 0); }
      if (reset || previous.error) commitRef.current('error', '');
      if (reset || previous.catalogue !== manifest.version) persistQueue(nextQueue);
      if (manifest.version) commitRef.current('catalogue', manifest.version);
    }).catch(() => { if (active) setError('无法读取本地音乐。'); });
    return () => { active = false; };
  }, [scope]);
  useEffect(() => { mixer.current.set(audio.current, volume); }, [volume, selected]);
  useEffect(() => {
    const flush = () => save(true);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);
  const cueReady=tracks.some(t=>t.id===ENDING_TRACK);
  useEffect(()=>{
    if(!endingVisible){if(cueActive.current)void stopEndingCue();cueAttempted.current=false;cueFinished.current=false;return;}
    if(cueReady&&!cueAttempted.current&&!cueFinished.current&&!quiet.current&&volume>0){
      startEndingCue();
    }
  },[endingVisible,endingRoute,cueReady]);
  const track = tracks.find(t => t.id === selected);
  async function play() {
    if (!audio.current) return;
    setError(''); intent.current = true;quiet.current=false;rememberMusicSilenced(false);setSilenced(false);commitRef.current('silenced',false);mixer.current.unlock();mixer.current.set(audio.current,volume);
    try { await audio.current.play();await mixer.current.ready(); } catch { audio.current?.pause();intent.current = false; setPlaying(false); setError('播放未开始，请再点播放。'); }
  }
  function activate(id: string, nextQueue: MusicQueue, shouldPlay: boolean) {
    const state = stateRef.current;
    if (!state.tracks.some(t => t.id === id)) return;
    save(true);if(id!==state.selected&&audio.current){audio.current.pause();mixer.current.forget(audio.current);} intent.current = shouldPlay; resume.current = 0; last.current = -1;
    setError(''); setTime(0); setQueue(nextQueue); persistQueue(nextQueue);
    commitRef.current('track', id); commitRef.current('position', 0);
    if (id === state.selected) {
      if (audio.current) audio.current.currentTime = 0;
      if (shouldPlay) void play(); else audio.current?.pause();
    } else { setDuration(0); setPlaying(false); setSelected(id); }
  }
  function step(direction: 1 | -1, shouldPlay = stateRef.current.playing) {
    const state = stateRef.current;
    const next = steppedQueue(state.queue, state.tracks.map(t => t.id), state.selected, direction);
    if (next.selected) activate(next.selected, next.queue, shouldPlay);
  }
  const player: Player = {
    tracks, selected, playing, time, duration, volume, error, mode: queue.mode,cueState,silenced,prepareEndingCue,startEndingCue:()=>startEndingCue(true),stopEndingCue,silence,enableEndingCue,
    select(id) { const state = stateRef.current; activate(id, manuallySelected(state.queue, state.tracks.map(t => t.id), id), true); },
    toggle() {
      if (playing) { quiet.current=true;rememberMusicSilenced(true);setSilenced(true);commitRef.current('silenced',true);intent.current = false; audio.current?.pause(); }
      else if (track) void play();
      else if (tracks.length) activate(queue.order[0] || tracks[0].id, queue, true);
    },
    previous() { step(-1); }, next() { step(1); },
    changeMode() {
      const state = stateRef.current;
      const nextQueue = queueFor(state.tracks.map(t => t.id), state.selected, state.queue.mode === 'shuffle' ? 'sequential' : 'shuffle');
      nextQueue.history = state.queue.history; nextQueue.historyCursor = state.queue.historyCursor;
      setQueue(nextQueue); persistQueue(nextQueue);
    },
    seek(n) { if (audio.current && duration > 0) { audio.current.currentTime = Math.max(0, Math.min(n, duration)); setTime(audio.current.currentTime); save(true); } },
    setVolume(n) { const value = Math.max(0, Math.min(1, n)); setVolumeState(value); commitRef.current('volume', value);rememberMusicSilenced(value===0);quiet.current=value===0;setSilenced(value===0);commitRef.current('silenced',value===0); },
    async add(file) {
      if (!file.type.startsWith('audio/')) { setError('请选择音频文件。'); return; }
      if (file.size > 25 * 1024 * 1024) { setError('试听音频请小于25MB。'); return; }
      try {
        const media = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(file); });
        // This is explicitly a local filename, not a guessed song identity.
        const row = { id: scope + ':' + randomId(), scope, title: file.name, artist: '本机文件', media };
        await library.tracks.put(row); setTracks(v => [...v, row]); setError('');
        const nextQueue = queueFor([...stateRef.current.tracks.map(t => t.id), row.id], stateRef.current.selected, stateRef.current.queue.mode);
        setQueue(nextQueue); persistQueue(nextQueue);
        if (!stateRef.current.selected) { intent.current = false; resume.current = 0; setSelected(row.id); setTime(0); setDuration(0); commitRef.current('track', row.id); commitRef.current('position', 0); }
      } catch { setError('音频未能保存，请检查浏览器存储空间。'); }
    },
  };
  return <MusicContext.Provider value={player}>
    <audio key={selected || 'none'} ref={audio} src={track?.media} preload="metadata" aria-label="后台音乐播放器"
      onLoadedMetadata={e => {
        const a = e.currentTarget; setDuration(Number.isFinite(a.duration) ? a.duration : 0);
        mixer.current.set(a,volume);
        if (resume.current) { a.currentTime = Math.min(resume.current, Number.isFinite(a.duration) ? a.duration : resume.current); resume.current = 0; }
        if (intent.current) void play();
      }}
      onPlay={() => { intent.current = true; setPlaying(true); }}
      onPause={e => { if (e.currentTarget !== audio.current) return; setPlaying(false); if (!e.currentTarget.ended) intent.current = false; save(true); }}
      onTimeUpdate={e => { if (e.currentTarget === audio.current) { setTime(e.currentTarget.currentTime); save(); } }}
      onEnded={() => {if(!cueActive.current)step(1, intent.current);}}
      onError={() => { if (track) { intent.current = false; setPlaying(false); setError('这份音频无法播放，请选择其他歌曲。'); } }} />
    <audio ref={cueAudio} src={tracks.find(t=>t.id===ENDING_TRACK)?.media} preload="metadata" aria-label="结局配乐播放器"
      onLoadedMetadata={e=>{const c=cueClip.current;if(c&&(c.end===null||c.end<=e.currentTarget.duration))e.currentTarget.currentTime=c.start;}}
      onTimeUpdate={e=>{const c=cueClip.current,a=e.currentTarget;if(!c||!cueActive.current||!cueStarted.current)return;const end=c.end??a.duration;
        if(a.currentTime>=end){a.pause();cueActive.current=false;cueFinished.current=true;clearCueTimers();setCueState('done');}
        else if(a.currentTime>=end-.7)mixer.current.fade(a,0,Math.max(10,(end-a.currentTime)*1000));}}
      onPause={e=>{if(cueActive.current&&cueStarted.current&&!e.currentTarget.ended&&!quiet.current){setCueState('blocked');}}}
      onEnded={()=>{cueActive.current=false;cueFinished.current=true;clearCueTimers();setCueState('done');}} onError={()=>cueFailed('配乐加载失败，请点播放图标重试。')}/>
    {children}
  </MusicContext.Provider>;
}
function useMusic() { const p = useContext(MusicContext); if (!p) throw Error('Music provider missing'); return p; }
export function MusicApp({ back }: { back: () => void }) {
  const p = useMusic(), selected = p.tracks.find(t => t.id === p.selected), [list, setList] = useState(false);
  return <section className="life-app music-library music-v2">
    <header><button onClick={back}>返回</button><h1>音乐</h1><button aria-label="打开歌单" aria-expanded={list} onClick={() => setList(v => !v)}><ListMusic size={22} /></button></header>
    <div className="music-art">{selected?.cover ? <img src={selected.cover} alt={selected.title + ' 封面'} /> : <Music2 size={66} strokeWidth={1} />}</div>
    <div className="music-now"><h2>{selected?.title || '选一首，慢慢玩'}</h2><p>{selected?.artist || '打开歌单选择歌曲'}</p></div>
    <label className="music-progress"><span className="sr-only">播放位置</span><input aria-label="音乐播放位置" type="range" min="0" max={p.duration || 1} step="0.1" disabled={!selected || !p.duration} value={Math.min(p.time, p.duration || 1)} onChange={e => p.seek(Number(e.target.value))} /></label>
    <div className="music-times" aria-label="播放进度"><span>{musicTime(p.time)}</span><span>{musicTime(p.duration)}</span></div>
    <div className="music-transport"><button aria-label="上一首" disabled={!p.tracks.length} onClick={p.previous}><SkipBack size={27} fill="currentColor" /></button><button className="music-play" disabled={!p.tracks.length} aria-label={p.playing ? '暂停音乐' : '播放音乐'} onClick={p.toggle}>{p.playing ? <Pause size={31} fill="currentColor" /> : <Play size={31} fill="currentColor" />}</button><button aria-label="下一首" disabled={!p.tracks.length} onClick={p.next}><SkipForward size={27} fill="currentColor" /></button></div>
    <button className="music-mode" aria-label="切换播放模式" onClick={p.changeMode}>{p.mode === 'shuffle' ? <Shuffle size={17} /> : <Repeat size={17} />}<span>{p.mode === 'shuffle' ? '随机播放' : '顺序播放'}</span></button>
    <label className="music-volume">音量<input aria-label="音乐音量" type="range" min="0" max="1" step="0.05" value={p.volume} onChange={e => p.setVolume(Number(e.target.value))} /></label>
    <button className="music-open-list" onClick={() => setList(true)}>歌单 · {p.tracks.length} 首</button>
    {p.error && <p role="alert">{p.error}</p>}
    <details className="music-import"><summary>本机试听文件</summary><label>导入音频<input type="file" accept="audio/*" aria-label="选择本机音频" onChange={e => { const f = e.target.files?.[0]; if (f) void p.add(f); e.target.value = ''; }} /></label><small>文件名按原样显示；本机文件不随剧情存档导出。</small></details>
    {list && <div className="music-playlist" role="dialog" aria-label="播放歌单"><header><strong>歌单 · {p.tracks.length} 首</strong><button aria-label="关闭歌单" onClick={() => setList(false)}><X size={22} /></button></header><div className="music-track-list">{p.tracks.map((t, i) => <button key={t.id} className="music-track" aria-label={t.title + ' — ' + (t.artist || '本机文件')} aria-pressed={t.id === p.selected} onClick={() => { p.select(t.id); setList(false); }}><span className="music-track-number">{i + 1}</span><span className="music-track-title">{t.title}<small>{t.artist}</small></span>{t.id === p.selected && <Music2 size={17} />}</button>)}</div></div>}
  </section>;
}
export function MusicMini({ open }: { open: () => void }) { const p = useMusic(); if (!p.selected) return null; return <div className="music-mini"><button aria-label="打开音乐播放器" onClick={open}><Music2 size={16} /></button><button aria-label={p.playing ? '暂停后台音乐' : '播放后台音乐'} onClick={p.toggle}>{p.playing ? <Pause size={16} /> : <Play size={16} />}</button></div>; }

export function useEndingMusic(){return useContext(MusicContext);}
export function EndingMusicControls(){
 const p=useMusic();
 const enabled=!p.silenced&&['loading','playing'].includes(p.cueState);
 return <aside className="ending-music-controls" aria-label="结局配乐控制" data-cue-state={p.cueState}>
  <button aria-label={enabled?'关闭结局配乐':'开启结局配乐'} aria-pressed={enabled} onClick={enabled?p.silence:p.enableEndingCue}>
   {enabled?<Volume2 size={20} aria-hidden="true"/>:<VolumeX size={20} aria-hidden="true"/>}
  </button>
 </aside>;
}
