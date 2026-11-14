/** Project types and display rules shared by the site and its agent-readable build. Imports nothing, so Node can load it directly. */
export type Media = { image_url: string; caption: string | null; media_type: string | null; video_thumbnail_url: string | null; display_order: number | null; is_primary: boolean | null };
export type PortfolioProject = { id: string; title: string; client: string; description: string; involvement: string | null; year: number | null; liveurl: string | null; unlisted: boolean; project_images: Media[]; tags: string[] };
export type ProjectRow = Omit<PortfolioProject, 'description' | 'tags'> & { description: string | null; project_tags: { tags: { name: string } | null }[] };

/** The columns the portfolio reads for each visible project. */
export const PROJECT_SELECT = 'id,title,client,description,involvement,year,liveurl,unlisted,project_tags(tags(name)),project_images(image_url,caption,is_primary,display_order,media_type,video_thumbnail_url)';

export const featuredIds = ['a29df936-41db-4244-b968-203b71235c76','dff59819-cbc1-46ab-8cef-011e0e2a963f','04193cf2-c3f0-4698-89d5-7593e1f29563','e7149d46-fad6-477b-a91c-77e76723df7d','7b4a9961-a088-46f4-bc88-8f0d64589227','d8307ba2-cc0e-4fc5-bc00-48fd5458dd08'];
export const featuredCopy = [
 ['See the risk. Know where to act.','Turning complex disease signals into a clear operational picture for global enterprises.','The Public Health Company / Decision intelligence'],
 ['A microethnography with strategic imperative.','Three months of field research, team mentorship, and product exploration with Google Beijing.','Google Beijing / Project Backpack'],
 ['Inspiration from the distant past to inform the distant future.','An exploration of textiles, materials science, and the preservation of human knowledge.','Project Ariadne / Research'],
 ['An AI companion for complex care.','Co-founded and co-built a platform that brought scattered health records into a patient’s own conversational workspace.','Noodle AI / Founder & builder'],
 ['A location-aware guide for the Smithsonian.','A location-aware guide, designed and developed for Smithsonian visitors.','Smithsonian / SiGuide'],
 ['A browser-based OS built with AI. From the ground up.','A working exploration of persistent agents, shared memory, and natural-language interaction.','Agentic OS / Design & engineering'],
];
function projectCopy(text: string, id: string) {
  return id === '7b4a9961-a088-46f4-bc88-8f0d64589227' ? text.replace(/\bsiguide\b/gi, 'SiGuide') : text;
}
/** Apply the portfolio's display rules to a project row from Supabase. */
export function normalizeProject(p: ProjectRow): PortfolioProject {
  return {...p,title:projectCopy(p.title,p.id),involvement:p.involvement?projectCopy(p.involvement,p.id):null,tags:p.project_tags.map(t=>t.tags?.name).filter((name):name is string=>!!name),description:projectCopy(p.description||'',p.id).replace('Noodle is closed to new sign ups but still servicing a number of patients who entrusted their information to the service.','Noodle has since dissolved. This is historical work.'),project_images:p.project_images.map(image=>({...image,caption:image.caption?projectCopy(image.caption,p.id):null})).sort((a,b)=>(a.display_order??999)-(b.display_order??999))};
}
export function cover(p: PortfolioProject) { const preferred: Record<string,number>={'d8307ba2-cc0e-4fc5-bc00-48fd5458dd08':9,'dff59819-cbc1-46ab-8cef-011e0e2a963f':3}; const m=p.project_images.find(m=>m.display_order===preferred[p.id])||p.project_images.find(m=>m.is_primary)||p.project_images[0]; return m?.media_type==='video'?m.video_thumbnail_url:m?.image_url; }
