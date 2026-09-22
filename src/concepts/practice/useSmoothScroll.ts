import { useEffect, useRef } from 'react';
import Lenis from '../os/node_modules/lenis';
import '../os/node_modules/lenis/dist/lenis.css';
export function useSmoothScroll(){
 const instance=useRef<Lenis|null>(null);
 useEffect(()=>{const preference=matchMedia('(prefers-reduced-motion: reduce)');const setup=()=>{instance.current?.destroy();instance.current=null;if(!preference.matches)instance.current=new Lenis({autoRaf:true,lerp:.09,smoothWheel:true,syncTouch:false,prevent:node=>!!node.closest('[data-lenis-prevent]')});};setup();preference.addEventListener('change',setup);return()=>{preference.removeEventListener('change',setup);instance.current?.destroy();};},[]);
 return (target:number|HTMLElement,immediate=false)=>{if(instance.current){instance.current.resize();instance.current.scrollTo(target,{immediate,force:true,offset:typeof target==='number'?0:-30});}else if(typeof target==='number')window.scrollTo({top:target,behavior:'instant'});else target.scrollIntoView({behavior:'instant'});};
}
