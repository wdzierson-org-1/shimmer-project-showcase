import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import { Maximize2, Minimize2, X, Grip } from 'lucide-react';
import CRTHero from '../os/original/CRTHero';
import { constrainWindow, type Geometry } from './windowGeometry';
import type { PortfolioProject } from './projects';
import './floating-terminal.css';
const viewport = () => ({ width: innerWidth, height: innerHeight });
export default function FloatingTerminal({ onClose, onCase, projects }: { onClose: () => void; onCase: (id: string) => void; projects: PortfolioProject[] }) {
 const [geometry,setGeometry] = useState<Geometry>(()=>constrainWindow({x:innerWidth-940,y:90,width:900,height:600},viewport()));
 const [maximized,setMaximized] = useState(false); const saved = useRef(geometry); const frame = useRef<HTMLDivElement>(null);
 const gesture=useRef<{ startX:number; startY:number; geometry:Geometry; resize:boolean }|null>(null);
 useEffect(()=>{const fit=()=>setGeometry(g=>constrainWindow(g,viewport()));window.addEventListener('resize',fit);return()=>window.removeEventListener('resize',fit);},[]);
 function start(event:PointerEvent,resize=false){if(event.button!==0||maximized||(event.target as HTMLElement).closest('button'))return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);gesture.current={startX:event.clientX,startY:event.clientY,geometry,resize};}
 function move(event:PointerEvent){const g=gesture.current;if(!g)return;const dx=event.clientX-g.startX,dy=event.clientY-g.startY;setGeometry(constrainWindow(g.resize?{...g.geometry,width:g.geometry.width+dx,height:g.geometry.height+dy}:{...g.geometry,x:g.geometry.x+dx,y:g.geometry.y+dy},viewport()));}
 function keyboard(event:KeyboardEvent,resize=false){if(!(event.target===event.currentTarget)||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)||maximized)return;event.preventDefault();const step=event.shiftKey?40:10;const dx=event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0;const dy=event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0;setGeometry(g=>constrainWindow(resize?{...g,width:g.width+dx,height:g.height+dy}:{...g,x:g.x+dx,y:g.y+dy},viewport()));}
 function toggleSize(){if(maximized){setGeometry(constrainWindow(saved.current,viewport()));setMaximized(false);}else{saved.current=geometry;setMaximized(true);}}
 return <div ref={frame} className={`floating-terminal ${maximized?'is-maximized':''}`} style={maximized?undefined:{left:geometry.x,top:geometry.y,width:geometry.width,height:geometry.height}} role="dialog" aria-modal="false" aria-labelledby="terminal-window-title" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}}}>
  <div className="terminal-window-bar" tabIndex={0} aria-label="Move terminal window using arrow keys" onKeyDown={e=>keyboard(e)} onPointerDown={e=>start(e)} onPointerMove={move} onPointerUp={()=>gesture.current=null} onPointerCancel={()=>gesture.current=null} onDoubleClick={e=>{if(!(e.target as HTMLElement).closest('button'))toggleSize();}}><span id="terminal-window-title">Terminal <span>~/will-dzierson</span></span><div><button aria-label={maximized?'Restore terminal size':'Maximize terminal'} onClick={toggleSize}>{maximized?<Minimize2 size={13}/>:<Maximize2 size={13}/>}</button><button aria-label="Close terminal" onClick={onClose}><X size={16}/></button></div></div>
  <div className="original-terminal-host" data-lenis-prevent><CRTHero onNavigate={href=>{const id=href.match(/(?:project\/|case=)([a-f0-9-]+)/)?.[1];if(id&&projects.some(p=>p.id===id)){onCase(id);}else if(href.startsWith('/')){onClose();location.hash='projects';}else window.open(href,'_blank','noopener,noreferrer');}}/></div><div className="original-terminal-status"><span>Willbot · Original CRT / RAG</span><span>Click to type · Esc to close</span></div>
  {!maximized&&<div className="terminal-resize" tabIndex={0} role="button" aria-label="Resize terminal with arrow keys or drag" onKeyDown={e=>keyboard(e,true)} onPointerDown={e=>start(e,true)} onPointerMove={move} onPointerUp={()=>gesture.current=null} onPointerCancel={()=>gesture.current=null}><Grip size={12}/></div>}
 </div>;
}
