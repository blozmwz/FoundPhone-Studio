import{it,expect,vi}from'vitest';
import{endingClip,ENDING_TRACK,CONFIRMED_ENDING_CLIP,readEndingClip,ENDING_CLIP_KEY}from'./endingMusic';
it('requires an explicitly selected valid fragment from the supplied track, never a guessed default',()=>{
 expect(endingClip(null)).toBe(null);expect(endingClip({track:ENDING_TRACK,start:'',end:''})).toBe(null);
 expect(endingClip({track:'wrong',start:1,end:8})).toBe(null);expect(endingClip({track:ENDING_TRACK,start:-1,end:8})).toBe(null);
 expect(endingClip({track:ENDING_TRACK,start:3,end:3.1})).toBe(null);expect(endingClip({track:ENDING_TRACK,start:3,end:99},90)).toBe(null);
 expect(endingClip({track:ENDING_TRACK,start:3,end:8},90)).toEqual({track:ENDING_TRACK,start:3,end:8});
});

it('uses the author-confirmed start and lets the song reach its natural end until an end is selected',()=>{expect(CONFIRMED_ENDING_CLIP).toEqual({track:ENDING_TRACK,start:0,end:null});expect(endingClip(CONFIRMED_ENDING_CLIP,226.9257)).toEqual(CONFIRMED_ENDING_CLIP);expect(endingClip(CONFIRMED_ENDING_CLIP,0)).toBe(null);});

it('the new playback policy ignores retired offset storage and cannot restore a 52s start',()=>{
 const requested:string[]=[];vi.stubGlobal('localStorage',{getItem:(key:string)=>{requested.push(key);return JSON.stringify({track:ENDING_TRACK,start:52,end:60});}});
 try{expect(readEndingClip()).toEqual({track:ENDING_TRACK,start:0,end:60});expect(requested).toEqual([ENDING_CLIP_KEY]);expect(ENDING_CLIP_KEY).not.toBe('thursday-ending-clip-review-v1');}finally{vi.unstubAllGlobals();}
});
