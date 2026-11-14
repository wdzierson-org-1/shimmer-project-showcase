import { createClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../../src/integrations/supabase/config.ts';
import type { Database } from '../../src/integrations/supabase/types.ts';
import { PROJECT_SELECT, normalizeProject } from '../../src/concepts/practice/projectData.ts';
import { mergeLocal } from '../../src/concepts/practice/localProjects.ts';
import { site } from '../../src/concepts/practice/profile.ts';
import { withProjectOrder } from '../../src/lib/projectOrder.ts';
import type { SiteData } from './pages.ts';

/** Read the public rows the site itself reads in the browser, with the same publishable key, filters, and order. */
export async function loadSiteData(): Promise<SiteData> {
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const signal = AbortSignal.timeout(30_000);
  const [projects, essays, settings] = await Promise.all([
    withProjectOrder(supabase.from('projects').select(`${PROJECT_SELECT},updated_at`).eq('visible', true)).abortSignal(signal),
    supabase.from('content_entries').select('id,title,content,created_at,updated_at').eq('visible', true).eq('type', 'thought').abortSignal(signal),
    supabase.from('site_settings').select('key,value').in('key', ['about_bio', 'about_resume_url', 'about_calendar_url']).abortSignal(signal),
  ]);
  const errors = [projects.error, essays.error, settings.error].flatMap(error => error ? [error.message] : []);
  if (errors.length) throw new Error(`agent-pages: couldn't read the portfolio from Supabase (${errors.join('; ')})`);
  return {
    // Case studies kept in code join the CMS rows, as they do in the browser. Their media paths are made absolute for readers off the site.
    projects: mergeLocal((projects.data ?? []).map(row => ({ ...normalizeProject(row), updated_at: row.updated_at })))
      .map(p => ({ updated_at: null, ...p, project_images: p.project_images.map(m => m.image_url.startsWith('/') ? { ...m, image_url: `${site.origin}${m.image_url}` } : m) })),
    essays: essays.data ?? [],
    settings: Object.fromEntries((settings.data ?? []).map(({ key, value }) => [key, value ?? ''])),
  };
}
