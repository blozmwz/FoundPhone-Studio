import { expect, it } from 'vitest';
import { manuallySelected, musicTime, queueFor, restoredQueue, steppedQueue } from './musicQueue';
const ids = ['a','b','c','d'];
it('sequential next/previous wraps and can retrace the actual sequence',()=>{
 let q=queueFor(ids,'a','sequential');
 let step=steppedQueue(q,ids,'a',-1);expect(step.selected).toBe('d');
 step=steppedQueue(step.queue,ids,step.selected,-1);expect(step.selected).toBe('c');
 step=steppedQueue(step.queue,ids,step.selected,1);expect(step.selected).toBe('d');
 step=steppedQueue(step.queue,ids,step.selected,1);expect(step.selected).toBe('a');
 q=queueFor(ids,'d','sequential');expect(steppedQueue(q,ids,'d',1).selected).toBe('a');
});
it('shuffle visits every song before reshuffling, and never repeats at the boundary',()=>{
 let selected='a',q=queueFor(ids,selected,'shuffle',()=>0);const seen=[selected];
 for(let n=0;n<3;n++){const step=steppedQueue(q,ids,selected,1,()=>0);q=step.queue;selected=step.selected;seen.push(selected);}
 expect(new Set(seen).size).toBe(4);
 const step=steppedQueue(q,ids,selected,1,()=>0);expect(step.selected).not.toBe(selected);
});
it('manual choice anchors the shuffled queue, preserves the mode, and previous uses listening history',()=>{
 let q=queueFor(ids,'a','shuffle',()=>0);q=manuallySelected(q,ids,'c',()=>0);
 expect(q.mode).toBe('shuffle');expect(q.order[0]).toBe('c');
 const back=steppedQueue(q,ids,'c',-1);expect(back.selected).toBe('a');
 const forward=steppedQueue(back.queue,ids,'a',1);expect(forward.selected).toBe('c');
 expect(steppedQueue(forward.queue,ids,'c',1).selected).toBe(q.order[1]);
});
it('restoring a valid shuffled queue never randomly chooses a different order',()=>{
 const q=queueFor(ids,'b','shuffle',()=>0);
 const restored=restoredQueue(ids,'b',{mode:q.mode,queue:q.order,history:q.history,historyIndex:q.historyCursor});
 expect(restored).toEqual(q);
 expect(restoredQueue(['x','y'],'',{mode:'shuffle',queue:ids}).order.sort()).toEqual(['x','y']);
});
it('handles empty/single-song lists, missing selections and display times',()=>{
 expect(steppedQueue(queueFor([],'','shuffle'),[],'',1).selected).toBe('');
 expect(steppedQueue(queueFor(['a'],'a','shuffle'),['a'],'a',1).selected).toBe('a');
 expect(steppedQueue(queueFor(ids,'','sequential'),ids,'',1).selected).toBe('a');
 expect(musicTime(196.8)).toBe('3:16');expect(musicTime(NaN)).toBe('0:00');
});
