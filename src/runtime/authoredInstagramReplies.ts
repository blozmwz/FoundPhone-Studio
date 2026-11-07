import type { Item, Runtime } from '../schema';
export function authoredReplyOptions(item:Item) {
 try {const rows:unknown=JSON.parse(item.meta.replyOptions||'[]');
  if(!Array.isArray(rows)||rows.length!==2)return [];
  return rows.every(r=>r&&typeof r.label==='string'&&typeof r.response==='string')
   ? rows as {label:string;response:string}[] : [];
 }catch{return [];}
}
export const authoredReplyKey=(id:string)=>'authoredReply:'+id;
export function authoredReplySelection(item:Item,ui:NonNullable<Runtime['ui']>[string]|undefined){
 const n=Number(ui?.[authoredReplyKey(item.id)]);return n===1||n===2?n:0;
}
// Derive a saved reply beside its original comment/DM. Never mutate source data.
export function instagramWithReplies(items:Item[],ui:NonNullable<Runtime['ui']>[string]|undefined,owner:string){
 return items.map(item=>{
  const n=authoredReplySelection(item,ui),opt=authoredReplyOptions(item)[n-1];
  if(!opt||item.folder==='私信')return item;
  const index=item.comments.length,parent=Number(item.meta.replyParent||0);
  let parents:Record<string,number>={};try{parents=JSON.parse(item.meta.commentParents||'{}');}catch{/* authored rows only */}
  return {...item,comments:[...item.comments,`${owner}：${opt.label}`,`${item.meta.replyAuthor||'mai'}：${opt.response}`],meta:{...item.meta,commentParents:JSON.stringify({...parents,[index]:parent,[index+1]:index})}};
 });
}
