import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withProjectOrder } from '@/lib/projectOrder';
export type Media = { image_url: string; caption: string | null; media_type: string | null; video_thumbnail_url: string | null; display_order: number | null; is_primary: boolean | null };
export type PortfolioProject = { id: string; title: string; client: string; description: string; involvement: string | null; year: number | null; liveurl: string | null; project_images: Media[]; tags: string[] };
export const featuredIds = ['a29df936-41db-4244-b968-203b71235c76','dff59819-cbc1-46ab-8cef-011e0e2a963f','04193cf2-c3f0-4698-89d5-7593e1f29563','e7149d46-fad6-477b-a91c-77e76723df7d','7b4a9961-a088-46f4-bc88-8f0d64589227','d8307ba2-cc0e-4fc5-bc00-48fd5458dd08'];
export const featuredCopy = [
 ['See the risk. Know where to act.','Turning complex disease signals into a clear operational picture for global enterprises.','The Public Health Company / Decision intelligence'],
 ['A microethnography with strategic imperative.','Three months of field research, team mentorship, and product exploration with Google Beijing.','Google Beijing / Project Backpack'],
 ['Inspiration from the distant past to inform the distant future.','An exploration of textiles, materials science, and the preservation of human knowledge.','Project Ariadne / Research'],
 ['An AI companion for complex care.','Co-founded and co-built a platform that brought scattered health records into a patient’s own conversational workspace.','Noodle AI / Founder & builder'],
 ['A location-aware guide for the Smithsonian.','A location-aware guide, designed and developed for Smithsonian visitors.','Smithsonian / SIguide'],
 ['A browser-based OS built with AI. From the ground up.','A working exploration of persistent agents, shared memory, and natural-language interaction.','Agentic OS / Design & engineering'],
];
export function cover(p: PortfolioProject) { const preferred: Record<string,number>={'d8307ba2-cc0e-4fc5-bc00-48fd5458dd08':9,'dff59819-cbc1-46ab-8cef-011e0e2a963f':3}; const m=p.project_images.find(m=>m.display_order===preferred[p.id])||p.project_images.find(m=>m.is_primary)||p.project_images[0]; return m?.media_type==='video'?m.video_thumbnail_url:m?.image_url; }
export function usePortfolioProjects(){
 const [projects,setProjects]=useState<PortfolioProject[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{let lastRefresh=0;const refresh=()=>{if(document.visibilityState==='visible'&&Date.now()-lastRefresh>1000){lastRefresh=Date.now();setRevision(r=>r+1);}};window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[]);
 useEffect(()=>{let active=true;setLoading(true);setError(false);(async()=>{try{const {data,error}=await withProjectOrder(supabase.from('projects').select('id,title,client,description,involvement,year,liveurl,project_tags(tags(name)),project_images(image_url,caption,is_primary,display_order,media_type,video_thumbnail_url)').eq('visible',true));if(error)throw error;if(active)setProjects((data||[]).map(p=>({...p,tags:p.project_tags.map(t=>t.tags?.name).filter((name):name is string=>!!name),description:(p.description||'').replace('Noodle is closed to new sign ups but still servicing a number of patients who entrusted their information to the service.','Noodle has since dissolved. This is historical work.'),project_images:[...p.project_images].sort((a,b)=>(a.display_order??999)-(b.display_order??999))})));}catch{if(active)setError(true);}finally{if(active)setLoading(false);}})();return()=>{active=false};},[revision]);
 return {projects,loading,error,retry:()=>setRevision(r=>r+1)};
}
