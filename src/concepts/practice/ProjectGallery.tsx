import { useRef, useState } from 'react';
import type { PortfolioProject } from './projects';
import WorkImage from './motion/WorkImage';
export default function ProjectGallery({project}:{project:PortfolioProject}){
 const [index,setIndex]=useState(0),[failed,setFailed]=useState(false); const touch=useRef<number|null>(null); const media=project.project_images, item=media[index];
 function move(n:number){setFailed(false);setIndex((n+media.length)%media.length);}
 if(!item)return <p className="gallery-empty">Images for this project are not available yet.</p>;
 return <section className="project-gallery" aria-label={`${project.title} gallery`} tabIndex={0} onKeyDown={e=>{if((e.target as HTMLElement).tagName==='VIDEO')return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(index+(e.key==='ArrowRight'?1:-1));}}}>
 <div className="gallery-stage" onTouchStart={e=>touch.current=e.touches[0].clientX} onTouchEnd={e=>{if(touch.current!==null&&Math.abs(e.changedTouches[0].clientX-touch.current)>55)move(index+(e.changedTouches[0].clientX<touch.current?1:-1));touch.current=null;}}>
 {failed?<p>This media could not load. Try the next item.</p>:item.media_type==='video'?<video key={item.image_url} src={item.image_url} poster={item.video_thumbnail_url||undefined} controls playsInline preload="metadata" onError={()=>setFailed(true)}/>:<WorkImage treatment="detail" key={item.image_url} src={item.image_url} alt={item.caption||`${project.title} — image ${index+1}`} onError={()=>setFailed(true)}/>}
 </div><div className="gallery-caption"><span aria-live="polite">{String(index+1).padStart(2,'0')} / {String(media.length).padStart(2,'0')} <span>{item.caption||project.title}</span></span><div><a href={item.image_url} target="_blank" rel="noreferrer">Full size ↗</a><button disabled={media.length<2} aria-label="Previous project image" onClick={()=>move(index-1)}>←</button><button disabled={media.length<2} aria-label="Next project image" onClick={()=>move(index+1)}>→</button></div></div>
 <div className="gallery-thumbnails" aria-label="Choose project media">{media.map((m,i)=><button key={m.image_url} aria-label={`View ${m.media_type==='video'?'video':'image'} ${i+1}`} aria-pressed={i===index} onClick={()=>move(i)}>{(m.media_type==='video'?m.video_thumbnail_url:m.image_url)?<img src={(m.media_type==='video'?m.video_thumbnail_url:m.image_url)!} alt="" loading="lazy"/>:<span>{i+1}</span>}{m.media_type==='video'&&<span className="video-mark">▶</span>}</button>)}</div></section>;
}
