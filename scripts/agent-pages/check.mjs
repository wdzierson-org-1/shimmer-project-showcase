// What does an AI agent see? Fetches the site the way readers that don't run JavaScript do,
// and reports the readable text on each page plus the files written for agents.
// Usage: npm run check:agents -- [base-url]   (default: http://localhost:4173, the `npm run preview` server)
const base = (process.argv[2] || 'http://localhost:4173').replace(/\/$/, '');
const headers = { 'user-agent': 'Mozilla/5.0 (compatible; agent-check/1.0)', accept: 'text/html,*/*;q=0.8' };

async function get(path) {
  const res = await fetch(base + path, { headers, redirect: 'follow' });
  return { status: res.status, type: (res.headers.get('content-type') || '').split(';')[0], body: await res.text() };
}
const words = text => (text.match(/\S+/g) || []).length;
const readable = html => html.replace(/<head[\s\S]*?<\/head>/i, ' ').replace(/<(script|style|template|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z0-9#]+;/gi, ' ');
const title = html => (html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '(no title)').replace(/&amp;/g, '&');
const trimSlash = path => path.replace(/(.)\/$/, '$1');
/** The path a page says it is. A missing generated page falls back to the homepage, which says "/". */
const canonicalPath = html => { const href = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1]; return href ? trimSlash(new URL(href).pathname) : null; };
const row = (path, status, detail) => console.log(`${String(status).padEnd(4)} ${path.padEnd(56)} ${detail}`);

let failures = 0;
const sitemap = await get('/sitemap.xml');
const paths = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
const project = paths.find(p => p.startsWith('/project/')), essay = paths.find(p => p.startsWith('/essay/'));

console.log(`Agent view of ${base}\n\nPages (text an HTML-only reader gets):`);
for (const path of ['/', '/career', project, essay].filter(Boolean)) {
  const page = await get(path), count = words(readable(page.body)), served = canonicalPath(page.body);
  const ownPage = served === trimSlash(path);
  if (page.status !== 200 || count < 100 || !ownPage) failures++;
  row(path, page.status, `${count} words · ${title(page.body)}${ownPage ? '' : ` · served ${served ?? 'a page with no canonical link'} instead`}`);
}
console.log('\nFiles for agents:');
for (const path of ['/llms.txt', '/llms-full.txt', project && `${project}.md`, '/sitemap.xml', '/robots.txt'].filter(Boolean)) {
  const file = await get(path), ok = file.status === 200 && file.type !== 'text/html';
  if (!ok) failures++;
  row(path, file.status, ok ? `${file.type} · ${words(file.body)} words` : `missing (got ${file.type || 'nothing'})`);
}
console.log(failures ? `\n${failures} check(s) failed: agents won't see this content.` : `\nAll checks passed. The sitemap lists ${paths.length} public pages.`);
process.exitCode = failures ? 1 : 0;
