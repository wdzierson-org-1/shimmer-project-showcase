import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cover, type PortfolioProject } from '../projects';
import { publications } from '../publications';

export type PortfolioArticle = { id: string; title: string; content: string; image_url: string | null; file_url: string | null };
export type ChatSource = { id: string; kind: 'project' | 'article'; title: string; label: string; url: string; image?: string | null; content: string };
export function projectSource(p: PortfolioProject): ChatSource {
  return { id: p.id, kind: 'project', title: p.title, label: p.client, url: `https://dzierson.com/#case=${p.id}`, image: cover(p), content: `${p.description}\nWill’s contribution: ${p.involvement || 'Not documented.'}\nYear: ${p.year || 'Not documented.'}` };
}
export function articleSources(articles: PortfolioArticle[]): ChatSource[] {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const records: ChatSource[] = articles.map(a => {
    const publication = publications.find(p => normalize(p.title) === normalize(a.title));
    return { id: a.id, kind: 'article', title: a.title, label: publication ? 'Essay · Medium' : 'Writing · Will Dzierson', url: publication?.url || `https://dzierson.com/#essay=${a.id}`, image: a.image_url, content: a.content };
  });
  // Public article metadata remains searchable even when its full text has not been added to the CMS.
  publications.forEach((p, i) => { if (!records.some(a => a.url === p.url)) records.push({ id: `publication-${i}`, kind: 'article', title: p.title, label: `${p.type} · Medium`, url: p.url, content: 'Publication title and URL only. Full article text is not available in these records; do not infer its arguments or details.' }); });
  return records;
}
export function usePortfolioWriting() {
  const [articles, setArticles] = useState<PortfolioArticle[]>([]), [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void supabase.from('content_entries').select('id,title,content,image_url,file_url').eq('visible', true).eq('type', 'thought').then(({ data }) => {
      if (active) { setArticles(data || []); setLoading(false); }
    }, () => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { articles, loading };
}
export { citedSources } from './citations';
