import { useEffect, useRef, useState } from 'react';
import { useEndingMusic } from './BackgroundMusic';
import { LockKeyhole, X } from 'lucide-react';

// Opening/cancelling this ending-only control does not dispatch a story event.
export function EndingLockControl({ onLock, soundtrack=false }: { onLock: () => void; soundtrack?:boolean }) {
  const music=useEndingMusic();
  const [open, setOpen] = useState(false), [drag, setDrag] = useState(0);
  const track = useRef<HTMLDivElement>(null), thumb = useRef<HTMLDivElement>(null);
  const launch = useRef<HTMLButtonElement>(null), start = useRef<number | null>(null);
  const distance = useRef(0), limit = useRef(0), scale = useRef(1), committed = useRef(false);
  useEffect(() => { if (open) thumb.current?.focus(); }, [open]);
  function reset() { start.current = null; distance.current = 0; setDrag(0); }
  function cancel() { reset(); setOpen(false); requestAnimationFrame(() => launch.current?.focus()); }
  function finish() { if (committed.current) return; committed.current = true; if(soundtrack)music?.startEndingCue(); reset(); setOpen(false); onLock(); }
  function travel() { return Math.max(0, (track.current?.clientWidth || 0) - (thumb.current?.offsetWidth || 0) - 16); }
  return <>
    <button ref={launch} style={{ visibility: open ? 'hidden' : undefined }} className="ending-lock-launch" onClick={() => { if(soundtrack)music?.prepareEndingCue();committed.current = false; setOpen(true); }}>
      <LockKeyhole size={21} aria-hidden="true" />滑动锁上手机
    </button>
    {open && <section className="ending-lock-control" role="dialog" aria-modal="true" aria-label="结尾锁屏"
      onKeyDown={e => {
        if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        if (e.key === 'Tab') { e.preventDefault(); const cancelButton = e.currentTarget.querySelector<HTMLButtonElement>('.ending-lock-cancel');
          if (document.activeElement === thumb.current) cancelButton?.focus(); else thumb.current?.focus(); }
      }}>
      <div ref={track} className="ending-lock-track">
        <div ref={thumb} className={'ending-lock-thumb' + (start.current !== null ? ' dragging' : '')}
          role="slider" tabIndex={0} aria-label="向右滑动锁上手机" aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={Math.round(drag / (travel() || 1) * 100)} aria-valuetext={drag ? '向右拖动中' : '拖到最右端锁屏'}
          style={{ transform: `translateX(${drag}px)` }}
          onPointerDown={e => { if (e.button !== 0) return; if(soundtrack)music?.prepareEndingCue();e.preventDefault(); e.stopPropagation();
            start.current = e.clientX; limit.current = travel(); scale.current = track.current ? track.current.getBoundingClientRect().width / track.current.clientWidth : 1; distance.current = 0; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={e => { if (start.current === null) return; e.stopPropagation();
            distance.current = Math.max(0, Math.min(limit.current, (e.clientX - start.current) / scale.current)); setDrag(distance.current); }}
          onPointerUp={e => { if (start.current === null) return; e.stopPropagation();
            const done = limit.current > 0 && distance.current >= limit.current - 1;
            reset(); if (done) finish(); }}
          onPointerCancel={reset}
          onKeyDown={e => {
            if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
            e.preventDefault(); const max = travel();
            const next = e.key === 'Home' ? 0 : e.key === 'End' ? max : Math.max(0, Math.min(max, drag + (e.key === 'ArrowRight' ? 10 : -10)));
            setDrag(next); if (max > 0 && next === max) finish();
          }}><LockKeyhole size={31} strokeWidth={1.8} aria-hidden="true" /></div>
        <span className="ending-lock-label" style={{ opacity: Math.max(0, 1 - drag / 65) }}>滑动锁上手机</span>
      </div>
      <button className="ending-lock-cancel" onClick={cancel}><span><X size={31} aria-hidden="true" /></span>取消</button>
    </section>}
  </>;
}
