import type{Runtime,Work}from'../schema';
// Additive repairs only. No re-send, selected reply, date jump or read mutation.
export function migrateReview39(work:Work,input:Runtime){
 if(work.variables.review39Revision!==1)return input;
 let state=input;const edit=()=>{if(state===input)state=structuredClone(input);return state;};
 if(/^\d{4}-\d{2}-\d{2}$/.test(String(state.variables.s45MoveDate||''))&&state.variables.s45DatesKnown!==true)edit().variables.s45DatesKnown=true;
 const appointment=['opening-appointment-1','opening-appointment-2'].some(id=>state.completed.includes(id));
 if(appointment&&work.data.notes?.some(i=>i.id==='daily-bills')&&!state.unlocked.includes('daily-bills'))edit().unlocked.push('daily-bills');
 if(state.variables.s28BranchChosen===true){if(state.variables.s45Typing!==false)edit().variables.s45Typing=false;}
 else if((state.choices.some(c=>/^s28-main-choice-send-[12]$/.test(c.target))||state.scheduled?.some(j=>j.nodeId==='s45-typing-stop'))&&state.variables.s45Typing!==true)edit().variables.s45Typing=true;
 return state;
}
