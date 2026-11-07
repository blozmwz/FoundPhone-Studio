// A conversation resumes after a meaningful gap; one separator per new session.
export function messageSessionBreak(previous:string|undefined,current:string,gapMinutes=30){
 if(!previous||previous.slice(0,10)!==current.slice(0,10))return true;
 const parse=(v:string)=>Date.parse(v.slice(0,16).replace(' ','T')+':00Z');
 const gap=parse(current)-parse(previous);return Number.isFinite(gap)&&gap>=gapMinutes*60000;
}
