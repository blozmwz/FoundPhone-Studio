import{dispatch}from'../engine';import{initialRuntime,type Work,type Runtime}from'../schema';import{randomId}from'../browserCrypto';import{journeyOf}from'./journeyProgress';
export function newPlaythrough(work:Work,previous:Runtime,normalScope:string){
 const id=normalScope+':chapter-replay:new-game-'+randomId();
 const state=dispatch(work,initialRuntime(work),'start');
 state.ui={...state.ui,profile:{...previous.ui?.profile,playerName:work.phone.owner},progress:journeyOf(previous),playthrough:{kind:'new-game'}};
 return{id,state};
}
