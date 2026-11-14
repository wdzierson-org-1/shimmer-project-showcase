import { hero, person, site } from '../../src/concepts/practice/profile.ts';
import { linkedin, medium, publications } from '../../src/concepts/practice/publications.ts';
import { listedProjects } from '../../src/lib/projectListing.ts';
import { abs, buildPages, link, projectFacts, projectSummary, publicationFor, type Page, type SiteData } from './pages.ts';
import { escapeHtml as html, escapeMarkdown as md, formatDate, isWebUrl, markdownToHtml } from './text.ts';

export type OutputFile = { path: string; contents: string };

const META = /<!-- page-meta -->[\s\S]*?<!-- \/page-meta -->/;
const ROOT = '<div id="root"></div>';
// Agents and crawlers that don't run JavaScript read the copy; browsers hide it until React replaces it on mount.
const HIDE_FOR_BROWSERS = "<script>document.documentElement.classList.add('agent-copy-hidden')</script>\n    <style>.agent-copy-hidden #agent-copy{display:none}#agent-copy{max-width:46rem;margin:0 auto;padding:3rem 1.25rem;font:17px/1.6 Inter,system-ui,sans-serif;color:#1f1d1a}</style>";

/** Every agent-readable file for one build: an HTML page and Markdown mirror per public view, plus llms.txt, llms-full.txt, and sitemap.xml. */
export function renderSite(data: SiteData, template: string): OutputFile[] {
  if (!META.test(template)) throw new Error('agent-pages: index.html needs a <!-- page-meta --> … <!-- /page-meta --> block around its page metadata');
  if (!template.includes(ROOT)) throw new Error('agent-pages: index.html needs an empty <div id="root"></div>');
  if (!listedProjects(data.projects).length) throw new Error('agent-pages: Supabase returned no listed projects; refusing to build an empty portfolio');
  const pages = buildPages(data);
  return [
    ...pages.flatMap(page => [
      { path: page.file, contents: pageHtml(page, template) },
      ...(page.markdownFile ? [{ path: page.markdownFile, contents: `${page.markdown}\n---\n\n${page.footer}\n` }] : []),
    ]),
    { path: 'llms.txt', contents: llmsIndex(data) },
    { path: 'llms-full.txt', contents: `${pages.filter(p => !p.noindex).map(p => p.markdown.trim()).join('\n\n---\n\n')}\n` },
    { path: 'sitemap.xml', contents: sitemap(pages) },
  ];
}

/** JSON for an inline script: nothing in CMS text can close the tag. */
const scriptJson = (value: unknown) => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);

function pageHtml(page: Page, template: string): string {
  const head = [
    `<title>${html(page.title)}</title>`,
    `<meta name="description" content="${html(page.description)}">`,
    `<meta name="author" content="${html(person.name)}">`,
    page.noindex ? '<meta name="robots" content="noindex">' : '',
    `<link rel="canonical" href="${html(page.url)}">`,
    page.markdownFile ? `<link rel="alternate" type="text/markdown" href="${html(abs(`/${page.markdownFile}`))}">` : '',
    `<meta property="og:site_name" content="${html(site.name)}">`,
    `<meta property="og:type" content="${page.type}">`,
    `<meta property="og:title" content="${html(page.title)}">`,
    `<meta property="og:description" content="${html(page.description)}">`,
    `<meta property="og:url" content="${html(page.url)}">`,
    `<meta property="og:image" content="${html(page.image.url)}">`,
    page.image.width ? `<meta property="og:image:width" content="${page.image.width}">` : '',
    page.image.height ? `<meta property="og:image:height" content="${page.image.height}">` : '',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${html(page.title)}">`,
    `<meta name="twitter:description" content="${html(page.description)}">`,
    `<meta name="twitter:image" content="${html(page.image.url)}">`,
    `<script type="application/ld+json">${scriptJson({ '@context': 'https://schema.org', '@graph': page.graph })}</script>`,
    HIDE_FOR_BROWSERS,
  ].filter(Boolean).join('\n    ');
  const body = `<div id="root"><div id="agent-copy">\n<main>\n${markdownToHtml(page.markdown)}</main>\n<footer>${markdownToHtml(page.footer)}</footer>\n</div></div>`;
  // Replacer functions keep "$" in CMS text from being read as a replacement pattern.
  return template.replace(META, () => head).replace(ROOT, () => body);
}

function llmsIndex({ projects, essays, settings }: SiteData): string {
  const item = (label: string, url: string, note: string) => `- ${link(label, url)}: ${note}`;
  const byDate = [...essays].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const writing = [
    ...publications.map(pub => {
      const essay = byDate.find(e => publicationFor(e) === pub);
      return item(md(pub.title), pub.url, `${md(pub.type)} on Medium${essay ? `; full text at ${abs(`/essay/${essay.id}.md`)}` : ''}`);
    }),
    ...byDate.filter(e => !publicationFor(e)).map(e => item(md(e.title), abs(`/essay/${e.id}.md`), `Essay, ${formatDate(e.created_at)}`)),
  ];
  return `${[
    `# ${md(person.name)}`,
    `> ${md(site.description)} Currently ${md(person.role)} at ${md(person.company)}, based in ${md(person.location)}.`,
    `${md(hero.intro.join(' '))} Contact: ${link(person.email, `mailto:${person.email}`)}.`,
    '## Profile',
    [
      item('Profile', abs('/index.md'), 'Bio, specializations, experience, every case study in brief, and writing'),
      item('Career', abs('/career.md'), 'Every role with its dates and what the work involved'),
      item('Everything in one file', abs('/llms-full.txt'), 'The full profile, every case study, and every essay'),
      isWebUrl(settings.about_resume_url) ? item('Résumé', settings.about_resume_url, 'Current résumé') : '',
    ].filter(Boolean).join('\n'),
    '## Case studies',
    listedProjects(projects).map(p => item(md(p.title), abs(`/project/${p.id}.md`), [md(projectFacts(p)), md(projectSummary(p, 180))].filter(Boolean).join('. '))).join('\n'),
    '## Writing',
    writing.join('\n'),
    '## Optional',
    [item('LinkedIn', linkedin, 'Professional profile'), item('Medium', medium, 'Published writing'), item('Sitemap', abs('/sitemap.xml'), 'Every public page')].join('\n'),
  ].join('\n\n')}\n`;
}

function sitemap(pages: Page[]): string {
  const xml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const urls = pages.filter(p => !p.noindex).map(p => `  <url><loc>${xml(p.url)}</loc>${p.lastModified ? `<lastmod>${p.lastModified.slice(0, 10)}</lastmod>` : ''}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
