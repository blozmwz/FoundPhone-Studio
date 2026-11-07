import type { Item } from '../schema';
import { randomId } from '../browserCrypto';
export type CommentRow = {text:string;index:number;id:string;replyTo?:string;replyToId?:string;replyToText?:string;replies:CommentRow[]};
type StoredComment={id:string;text:string;parentId?:string};
function parseLocal(text:string,index:number,legacyAuthor=''):StoredComment {
 try{const r=JSON.parse(text);if(r&&typeof r.id==='string'&&/^l:[a-f0-9-]+$/.test(r.id)&&typeof r.text==='string')return{id:r.id,text:r.text,...(typeof r.parentId==='string'?{parentId:r.parentId}:{})};}catch{/* Existing flat local comments stay flat; no guessed parent. */}
 return{id:'legacy:'+index,text:(legacyAuthor?legacyAuthor+'：':'')+text};
}
export function commentAuthor(text:string){return text.split(/[：:]/)[0].split(' 回复 ')[0].trim();}
export function encodeComment(postId:string,author:string,body:string,parentId?:string){return postId+'\t'+JSON.stringify({id:'l:'+randomId(),text:author+'：'+body,...(parentId?{parentId}:{})});}
// Authored links are explicit indices; new local replies persist stable parent IDs.
export function instagramCommentRows(item:Item,local:string[],legacyAuthor=''):CommentRow[]{
 let parents:Record<string,unknown>={};try{const r=JSON.parse(item.meta.commentParents||'{}');if(r&&typeof r==='object'&&!Array.isArray(r))parents=r;}catch{/* No inferred relationship. */}
 const authored=item.comments.map((text,index)=>({text,index,id:'a:'+index,replies:[] as CommentRow[]}));
 const all:CommentRow[]=[...authored,...local.map((text,index)=>({...parseLocal(text,index,legacyAuthor),index:authored.length+index,replies:[] as CommentRow[]}))];
 const byId=new Map(all.map(r=>[r.id,r])),roots=new Map<string,CommentRow>(),nested=new Set<string>();
 for(const row of all){const parentId= row.index<authored.length ? (typeof parents[row.index]==='number'?'a:'+parents[row.index]:'') : (parseLocal(local[row.index-authored.length],row.index-authored.length,legacyAuthor).parentId||'');
  const parent=byId.get(parentId);if(!parent||parent.index>=row.index||parent.id===row.id){roots.set(row.id,row);continue;}
  // Keep the direct target for context, even if the thread is visually flattened.
  const root=roots.get(parent.id);if(!root){roots.set(row.id,row);continue;}
  row.replyTo=commentAuthor(parent.text);row.replyToId=parent.id;row.replyToText=parent.text;
  root.replies.push(row);roots.set(row.id,root);nested.add(row.id);
 }
 return all.filter(row=>!nested.has(row.id));
}
