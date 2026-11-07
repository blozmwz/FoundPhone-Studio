import { safeMedia } from '../schema';
export function PhotoViewer({src,title,onClose}:{src:string;title:string;onClose:()=>void}){
 const media=safeMedia(src);if(!media)return null;
 return <div className="phone-photo-viewer" role="dialog" aria-label="完整原图" onClick={onClose}>
  <button aria-label="关闭原图" onClick={onClose}>关闭</button>
  <img src={media} alt={title} onClick={e=>e.stopPropagation()}/>
 </div>;
}
