import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSite } from '../agent-pages/render.ts';
import { person, site } from '../../src/concepts/practice/profile.ts';
import { linkedin } from '../../src/concepts/practice/publications.ts';

const SIGUIDE = '11111111-1111-4111-8111-111111111111';
const HOSTILE = '22222222-2222-4222-8222-222222222222';
const UNLISTED = '33333333-3333-4333-8333-333333333333';
const ESSAY = '44444444-4444-4444-8444-444444444444';

const template = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <!-- page-meta -->
    <title>Placeholder</title>
    <meta name="description" content="Placeholder" />
    <!-- /page-meta -->
    <script type="module" crossorigin src="/assets/index-test.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

const image = { image_url: 'https://cdn.test/siguide.png', caption: 'The SiGuide device', media_type: 'image', video_thumbnail_url: null, display_order: 0, is_primary: true };
const data = {
  projects: [
    { id: SIGUIDE, title: 'Smithsonian Guide Device (SiGuide)', client: 'The Smithsonian Institution', year: 2005, description: '**Make discovery tangible.** An interactive guide for museum visitors.\n\nSecond paragraph.', involvement: 'Designed and developed the guide.', liveurl: 'https://example.org/siguide', unlisted: false, tags: ['Mobile', 'Museums'], project_images: [image], updated_at: '2026-03-29T12:00:00Z' },
    { id: HOSTILE, title: 'Risky <script>alert(1)</script> project', client: 'Client & Co', year: 2020, description: 'Raw <img src=x onerror=alert(1)> html, a [bad link](javascript:alert(1)) and a [good link](https://example.com/ok), a [disguised link](<java\tscript:alert(3)>). Budget: $& and $1 stay literal.', involvement: null, liveurl: 'javascript:alert(2)', unlisted: false, tags: [], project_images: [], updated_at: null },
    { id: UNLISTED, title: 'Biological Insight Platform', client: 'InsideTracker', year: 2026, description: 'Private partner work.', involvement: 'Led product and design.', liveurl: null, unlisted: true, tags: ['Health'], project_images: [], updated_at: '2026-10-13T00:00:00Z' },
  ],
  essays: [{ id: ESSAY, title: 'AI Agent Accountability: Who’s Responsible When No One’s Home?', content: 'Agents need **identity**, authorization, and attribution.', created_at: '2026-04-06T10:00:00Z', updated_at: '2026-04-07T10:00:00Z' }],
  settings: { about_bio: 'I sit at the intersection of product, design and engineering.\n\nAt Google, I led design on [mobile experiences](https://www.youtube.com/watch?v=JKxzX3p1iRs).', about_resume_url: '', about_calendar_url: '' },
};

const render = (input = data, shell = template) => Object.fromEntries(renderSite(input, shell).map(file => [file.path, file.contents]));
const text = html => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const jsonLd = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => JSON.parse(m[1])['@graph']);
const files = render();

test('writes a page and a Markdown mirror for each public view, plus the agent index files', () => {
  assert.deepEqual(Object.keys(files).sort(), [
    'career.md', 'career/index.html',
    `essay/${ESSAY}.md`, `essay/${ESSAY}/index.html`,
    'index.html', 'index.md', 'llms-full.txt', 'llms.txt',
    `project/${HOSTILE}.md`, `project/${HOSTILE}/index.html`,
    `project/${SIGUIDE}.md`, `project/${SIGUIDE}/index.html`,
    `project/${UNLISTED}/index.html`,
    'sitemap.xml',
  ].sort());
});

test('the homepage HTML carries the profile inside the app root', () => {
  const html = files['index.html'];
  assert.match(html, /<div id="root"><div id="agent-copy">/);
  assert.match(html, /<script type="module" crossorigin src="\/assets\/index-test.js"><\/script>/, 'keeps the app bundle');
  assert.doesNotMatch(html, /Placeholder/, 'replaces the template’s page meta');
  assert.match(html, /<title>Will Dzierson — Product, design &amp; engineering<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/dzierson.com\/">/);
  const copy = text(html);
  for (const fact of [person.name, person.role, person.company, person.experience, person.location, person.email, 'I sit at the intersection of product, design and engineering.', 'Yahoo!', 'Agentic AI Is Not a Magical Elf']) {
    assert.ok(copy.includes(fact), `homepage mentions ${fact}`);
  }
  assert.match(html, new RegExp(`href="https://dzierson.com/project/${SIGUIDE}"`));
  assert.match(html, new RegExp(`href="https://dzierson.com/project/${HOSTILE}"`));
  assert.ok(!copy.includes('Biological Insight Platform'), 'unlisted work stays off the homepage');
});

test('the homepage skips sections it has nothing for and counts its case studies', () => {
  assert.ok(!files['index.md'].includes('## Selected work'), 'no featured project is in this data');
  assert.ok(files['index.md'].includes('## All work (2 case studies)'));
  const one = render({ ...data, projects: data.projects.slice(0, 1) });
  assert.ok(one['index.md'].includes('## All work (1 case study)'));
});

test('the agent copy is hidden by a script-set class, not by attributes text extractors drop', () => {
  const html = files['index.html'];
  assert.match(html, /<div id="agent-copy">/, 'no hidden attribute or inline style on the copy');
  const head = html.slice(0, html.indexOf('</head>'));
  assert.match(head, /document\.documentElement\.classList\.add\('agent-copy-hidden'\)/);
  assert.match(head, /\.agent-copy-hidden #agent-copy\{display:none\}/);
});

test('each case page describes its own project', () => {
  const html = files[`project/${SIGUIDE}/index.html`];
  assert.match(html, /<title>Smithsonian Guide Device \(SiGuide\) — Will Dzierson<\/title>/);
  assert.match(html, new RegExp(`<link rel="canonical" href="https://dzierson.com/project/${SIGUIDE}">`));
  assert.match(html, /<meta property="og:image" content="https:\/\/cdn.test\/siguide.png">/);
  assert.match(html, /<meta name="description" content="Make discovery tangible. An interactive guide for museum visitors. Second paragraph.">/);
  assert.match(html, new RegExp(`<link rel="alternate" type="text/markdown" href="https://dzierson.com/project/${SIGUIDE}.md">`));
  assert.match(html, /href="https:\/\/example.org\/siguide"/);
  assert.doesNotMatch(html, /name="robots"/);
  const copy = text(html);
  for (const fact of ['Make discovery tangible.', 'Second paragraph.', 'Designed and developed the guide.', 'The Smithsonian Institution', '2005', 'Mobile', 'Museums', 'The SiGuide device']) {
    assert.ok(copy.includes(fact), `case page mentions ${fact}`);
  }
  assert.match(files[`project/${SIGUIDE}.md`], /^# Smithsonian Guide Device \(SiGuide\)\n/);
});

test('an unlisted case keeps its direct page but asks not to be indexed', () => {
  const html = files[`project/${UNLISTED}/index.html`];
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.ok(text(html).includes('Private partner work.'));
});

test('structured data describes the person and each case study', () => {
  const homeGraph = jsonLd(files['index.html']);
  const me = homeGraph.find(node => node['@type'] === 'Person');
  assert.equal(me.name, person.name);
  assert.equal(me.jobTitle, person.role);
  assert.equal(me.worksFor.name, person.company);
  assert.ok(me.sameAs.includes(linkedin));
  assert.ok(homeGraph.some(node => node['@type'] === 'ProfilePage'));
  const work = jsonLd(files[`project/${SIGUIDE}/index.html`]).find(node => node['@type'] === 'CreativeWork');
  assert.equal(work.name, 'Smithsonian Guide Device (SiGuide)');
  assert.equal(work.url, `${site.origin}/project/${SIGUIDE}`);
  assert.equal(work.dateCreated, '2005');
});

test('llms.txt indexes listed work and writing as Markdown links', () => {
  const index = files['llms.txt'];
  assert.match(index, /^# Will Dzierson\n\n> /);
  assert.ok(index.includes(`(https://dzierson.com/project/${SIGUIDE}.md)`));
  assert.ok(index.includes('(https://dzierson.com/llms-full.txt)'));
  assert.ok(index.includes('https://medium.com/@willdzierson/ai-agent-accountability'), 'a published essay links to Medium');
  assert.ok(!index.includes(UNLISTED));
});

test('llms-full.txt holds every listed case in full and leaves unlisted work out', () => {
  const full = files['llms-full.txt'];
  for (const fact of ['Second paragraph.', 'Designed and developed the guide.', 'Agents need **identity**', person.role]) assert.ok(full.includes(fact), fact);
  assert.ok(!full.includes('Private partner work.'));
});

test('the sitemap lists public pages with their last edit and leaves unlisted work out', () => {
  const sitemap = files['sitemap.xml'];
  assert.match(sitemap, /<loc>https:\/\/dzierson.com\/<\/loc>/);
  assert.match(sitemap, new RegExp(`<loc>https://dzierson.com/project/${SIGUIDE}</loc><lastmod>2026-03-29</lastmod>`));
  assert.match(sitemap, new RegExp(`<loc>https://dzierson.com/essay/${ESSAY}</loc><lastmod>2026-04-07</lastmod>`));
  assert.ok(!sitemap.includes(UNLISTED));
});

test('CMS text cannot inject markup or scripts into generated pages', () => {
  const html = files[`project/${HOSTILE}/index.html`];
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!/href="javascript:/i.test(html));
  assert.ok(!html.includes('script:alert(3)'), 'a link disguised with a tab is dropped, not just encoded');
  assert.match(html, /<title>Risky &lt;script&gt;alert\(1\)&lt;\/script&gt; project — Will Dzierson<\/title>/);
  assert.match(html, /href="https:\/\/example.com\/ok"/);
  const work = jsonLd(html).find(node => node['@type'] === 'CreativeWork');
  assert.equal(work.name, 'Risky <script>alert(1)</script> project', 'JSON-LD survives a title containing </script>');
  assert.ok(!files['index.html'].includes('<script>alert(1)</script>'));
});

test('dollar signs in CMS text stay literal when pages are assembled', () => {
  assert.ok(text(files[`project/${HOSTILE}/index.html`]).includes('Budget: $& and $1 stay literal.'));
});

test('a template without its markers, or data without listed work, fails the build', () => {
  assert.throws(() => render(data, template.replace('<!-- page-meta -->', '')), /page-meta/);
  assert.throws(() => render(data, template.replace('<div id="root"></div>', '<div id="root">x</div>')), /root/);
  assert.throws(() => render({ ...data, projects: data.projects.filter(p => p.unlisted) }), /listed projects/);
});
