import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withProjectOrder } from '@/lib/projectOrder';
import { PROJECT_SELECT, normalizeProject, type PortfolioProject } from './projectData';
import { localProjects, mergeLocal } from './localProjects';
export { cover, featuredCopy, featuredIds, type Media, type PortfolioProject } from './projectData';

export function usePortfolioProjects(){
 const [projects,setProjects]=useState<PortfolioProject[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{let lastRefresh=0;const refresh=()=>{if(document.visibilityState==='visible'&&Date.now()-lastRefresh>1000){lastRefresh=Date.now();setRevision(r=>r+1);}};window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[]);
 useEffect(()=>{let active=true;setLoading(true);setError(false);(async()=>{try{const {data,error}=await withProjectOrder(supabase.from('projects').select(PROJECT_SELECT).eq('visible',true));if(error)throw error;if(active)setProjects(mergeLocal((data||[]).map(p=>normalizeProject(p))));}catch{if(active){setProjects(localProjects);setError(true);}}finally{if(active)setLoading(false);}})();return()=>{active=false};},[revision]);
 return {projects,loading,error,retry:()=>setRevision(r=>r+1)};
}
