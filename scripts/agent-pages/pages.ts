import { brands, career, hero, pageTitle, person, practice, roles, site, specializations, writing } from '../../src/concepts/practice/profile.ts';
import { cover, featuredCopy, featuredIds, type PortfolioProject } from '../../src/concepts/practice/projectData.ts';
import { linkedin, lovableFeature, medium, publications } from '../../src/concepts/practice/publications.ts';
import { caseUrl, essayUrl } from '../../src/concepts/practice/routes.ts';
import { listedProjects } from '../../src/lib/projectListing.ts';
import { cleanText, escapeMarkdown as md, formatDate, isWebUrl, mdUrl, plainText, summarize } from './text.ts';

/** What the build reads from Supabase (see data.ts). Projects arrive normalized and in display order. */
export type AgentProject = PortfolioProject & { updated_at: string | null };
export type Essay = { id: string; title: string; content: string; created_at: string; updated_at: string | null };
export type SiteSettings = { about_bio?: string; about_resume_url?: string; about_calendar_url?: string };
export type SiteData = { projects: AgentProject[]; essays: Essay[]; settings: SiteSettings };

/** One public view: where it's written, how it's described, and its content as Markdown. */
export type Page = {
  file: string;
  markdownFile?: string;
  url: string;
  title: string;
  description: string;
  image: { url: string; width?: number; height?: number };
  type: 'profile' | 'article';
  noindex: boolean;
  lastModified?: string;
  markdown: string;
  footer: string;
  graph: Record<string, unknown>[];
};

export const abs = (path: string) => `${site.origin}${path}`;
export const link = (label: string, url: string) => `[${label}](${mdUrl(url)})`;
export const projectFacts = (p: AgentProject) => [p.client, p.year].filter(Boolean).join(', ');
export const projectSummary = (p: AgentProject, max: number) => summarize(plainText(cleanText(p.description)), max);
const titleKey = (title: string) => title.toLowerCase().replace(/[^a-z0-9]/g, '');
/** An essay that is also published on Medium, matched by title the way Ask AI matches them. */
export const publicationFor = (essay: Essay) => publications.find(pub => titleKey(pub.title) === titleKey(essay.title));

const defaultImage = { url: abs(site.image.path), width: site.image.width, height: site.image.height };
const personId = abs('/#person'), websiteId = abs('/#website');
const brandList = `${brands.map(b => md(b.label)).join(', ')}.`;
const experience = roles.map(r => `- **${md(r.name)}** — ${md(r.role)} (${md(r.dates)}). ${md(r.description)}`).join('\n');
const pageFooter = `${link(`${md(person.name)} — profile and all work`, abs('/'))} · ${link('Career', abs('/career'))} · ${link('Index for AI agents', abs('/llms.txt'))}`;
const join = (blocks: string[]) => `${blocks.filter(Boolean).join('\n\n')}\n`;

function personNode(): Record<string, unknown> {
  return {
    '@type': 'Person', '@id': personId, name: person.name, url: abs('/'), description: site.description,
    jobTitle: person.role, worksFor: { '@type': 'Organization', name: person.company, url: person.companyUrl },
    address: { '@type': 'PostalAddress', addressLocality: person.address.locality, addressRegion: person.address.region, addressCountry: person.address.country },
    email: `mailto:${person.email}`, knowsAbout: specializations, sameAs: [linkedin, medium],
  };
}

function writingList(essays: Essay[]) {
  const published = publications.map(pub => {
    const essay = essays.find(e => publicationFor(e) === pub);
    return `- ${link(md(pub.title), pub.url)} — ${md(pub.type)}, Medium${essay ? ` (${link('read it here', abs(essayUrl(essay.id)))})` : ''}`;
  });
  const own = essays.filter(e => !publicationFor(e)).map(e => `- ${link(md(e.title), abs(essayUrl(e.id)))} — Essay, ${formatDate(e.created_at)}`);
  return [...published, ...own].join('\n');
}

function profilePage({ settings }: SiteData, listed: AgentProject[], essays: Essay[]): Page {
  const featured = featuredIds.flatMap((id, i) => { const p = listed.find(x => x.id === id); return p ? [{ p, copy: featuredCopy[i] }] : []; });
  const caseLink = (id: string, label: string) => listed.some(p => p.id === id) ? ` ${link(md(label), abs(caseUrl(id)))}` : '';
  const facts = [
    `- **Current role:** ${md(person.role)} at ${link(md(person.company), person.companyUrl)}`,
    `- **Experience:** ${person.experience} in design and technology`,
    `- **Location:** ${md(person.location)}`,
    `- **Email:** ${link(person.email, `mailto:${person.email}`)}`,
    `- **Elsewhere:** ${link('LinkedIn', linkedin)} · ${link('Medium', medium)}`,
    isWebUrl(settings.about_resume_url) ? `- **Résumé:** ${link('Current résumé', settings.about_resume_url)}` : '',
    isWebUrl(settings.about_calendar_url) ? `- **Book a conversation:** ${link('Calendar', settings.about_calendar_url)}` : '',
  ].filter(Boolean).join('\n');
  const markdown = join([
    `# ${md(person.name)}`,
    `**${md(site.tagline)}.** ${md(site.description)}`,
    facts,
    md(hero.intro.join(' ')),
    '## About',
    cleanText(settings.about_bio),
    md(practice.statement),
    '## Specializations',
    specializations.map(s => `- ${md(s)}`).join('\n'),
    '## How I work',
    ...practice.lenses.map(l => `### ${md(l.label)}: ${md(l.heading)}\n\n${md(l.body)}${l.detail ? ` (${md(l.detail)})` : ''}${l.link ? caseLink(l.link.caseId, l.link.label) : ''}`),
    '## Experience',
    experience,
    md(career.note),
    featured.length ? '## Selected work' : '',
    featured.map(({ p, copy }) => `- ${link(md(p.title), abs(caseUrl(p.id)))} — ${md(projectFacts(p))}. **${md(copy[0])}** ${md(copy[1])}`).join('\n'),
    `## All work (${listed.length} case ${listed.length === 1 ? 'study' : 'studies'})`,
    listed.map(p => { const summary = projectSummary(p, 220); return `- ${link(md(p.title), abs(caseUrl(p.id)))} — ${md(projectFacts(p))}.${summary ? ` ${md(summary)}` : ''}`; }).join('\n'),
    '## Writing',
    md(writing.intro),
    writingList(essays),
    `${md(writing.recognition)} Portfolio ${link('featured by Lovable', lovableFeature)}.`,
    '## Selected teams and clients',
    brandList,
    '## Contact',
    `${link(person.email, `mailto:${person.email}`)} · ${md(person.location)} · ${link('LinkedIn', linkedin)} · ${link('Medium', medium)}`,
  ]);
  const footer = `For AI agents and other readers: ${link('llms.txt', abs('/llms.txt'))} indexes this site, ${link('llms-full.txt', abs('/llms-full.txt'))} holds every case study in one file, and each page has a Markdown version.`;
  return {
    file: 'index.html', markdownFile: 'index.md', url: abs('/'), title: site.title, description: site.description, image: defaultImage, type: 'profile', noindex: false, markdown, footer,
    graph: [
      { '@type': 'ProfilePage', '@id': abs('/#profile'), url: abs('/'), name: site.title, mainEntity: { '@id': personId }, isPartOf: { '@id': websiteId } },
      personNode(),
      { '@type': 'WebSite', '@id': websiteId, url: abs('/'), name: site.name, publisher: { '@id': personId } },
    ],
  };
}

function careerPage(): Page {
  const url = abs('/career'), title = pageTitle('Career');
  const markdown = join([`# Career — ${md(person.name)}`, `**${md(career.heading.join(' '))}** ${md(career.intro)}`, experience, md(career.note), '## Selected teams and clients', brandList]);
  return {
    file: 'career/index.html', markdownFile: 'career.md', url, title, description: summarize(career.intro), image: defaultImage, type: 'profile', noindex: false, markdown, footer: pageFooter,
    graph: [{ '@type': 'ProfilePage', '@id': url, url, name: title, mainEntity: { '@id': personId }, isPartOf: { '@id': websiteId } }, personNode()],
  };
}

function casePage(p: AgentProject): Page {
  const url = abs(caseUrl(p.id)), image = cover(p);
  const description = projectSummary(p, 160) || `${p.title}, a case study by ${person.name}.`;
  const media = p.project_images.map((m, i) => `- ${link(md(m.caption || `${p.title} — ${m.media_type === 'video' ? 'video' : 'image'} ${i + 1}`), m.image_url)}`).join('\n');
  const markdown = join([
    `# ${md(p.title)}`,
    `${md(projectFacts(p))} · Case study by ${md(person.name)}`,
    p.tags.length ? `**Tags:** ${p.tags.map(tag => md(tag)).join(', ')}` : '',
    isWebUrl(p.liveurl) ? `**Project link:** ${link(md(p.liveurl), p.liveurl)}` : '',
    p.involvement ? `## My contribution\n\n${cleanText(p.involvement)}` : '',
    `## The work\n\n${cleanText(p.description)}`,
    media ? `## Images and video\n\n${media}` : '',
  ]);
  return {
    // Unlisted cases keep a direct page for people with the link, but no Markdown mirror and no place in any index.
    file: `project/${p.id}/index.html`, markdownFile: p.unlisted ? undefined : `project/${p.id}.md`, url, title: pageTitle(p.title), description,
    image: isWebUrl(image) ? { url: image } : defaultImage, type: 'article', noindex: p.unlisted, lastModified: p.updated_at ?? undefined, markdown, footer: pageFooter,
    graph: [
      { '@type': 'CreativeWork', '@id': url, url, name: p.title, description, dateCreated: p.year ? String(p.year) : undefined, keywords: p.tags.length ? p.tags.join(', ') : undefined, image: isWebUrl(image) ? image : undefined, creator: { '@id': personId }, isPartOf: { '@id': websiteId } },
      personNode(),
    ],
  };
}

function essayPage(e: Essay): Page {
  const url = abs(essayUrl(e.id)), publication = publicationFor(e);
  const description = summarize(plainText(cleanText(e.content))) || `${e.title}, an essay by ${person.name}.`;
  const markdown = join([`# ${md(e.title)}`, `Essay by ${md(person.name)} · ${formatDate(e.created_at)}${publication ? ` · Also published on ${link('Medium', publication.url)}` : ''}`, cleanText(e.content)]);
  return {
    file: `essay/${e.id}/index.html`, markdownFile: `essay/${e.id}.md`, url, title: pageTitle(e.title), description, image: defaultImage, type: 'article', noindex: false, lastModified: e.updated_at ?? e.created_at, markdown, footer: pageFooter,
    graph: [
      { '@type': 'Article', '@id': url, url, headline: e.title, description, datePublished: e.created_at, dateModified: e.updated_at ?? undefined, author: { '@id': personId }, isPartOf: { '@id': websiteId }, sameAs: publication?.url },
      personNode(),
    ],
  };
}

/** Every public view, homepage first. Unlisted cases are included with `noindex`; callers decide what to index. */
export function buildPages(data: SiteData): Page[] {
  for (const { id } of [...data.projects, ...data.essays]) if (!/^[\w-]+$/.test(id)) throw new Error(`agent-pages: refusing to write a page for unexpected id "${id}"`);
  const essays = [...data.essays].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return [profilePage(data, listedProjects(data.projects), essays), careerPage(), ...data.projects.map(casePage), ...essays.map(essayPage)];
}
