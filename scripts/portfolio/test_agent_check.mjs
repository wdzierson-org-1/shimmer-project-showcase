import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import http from 'node:http';
import { promisify } from 'node:util';

const run = promisify(execFile);
const origin = 'https://dzierson.com';
const page = (path, title) => ({ type: 'text/html', body: `<!DOCTYPE html><html><head><title>${title}</title><link rel="canonical" href="${origin}${path}"></head><body><div id="root"><div id="agent-copy"><h1>${title}</h1><p>${'readable words '.repeat(80)}</p></div></div></body></html>` });
const text = (type, body) => ({ type, body });
const home = page('/', 'Will Dzierson');

const site = {
  '/': home,
  '/career': page('/career', 'Career'),
  '/project/p1': page('/project/p1', 'A case study'),
  '/essay/e1': page('/essay/e1', 'An essay'),
  '/sitemap.xml': text('application/xml', ['/', '/career', '/project/p1', '/essay/e1'].map(p => `<url><loc>${origin}${p}</loc></url>`).join('')),
  '/llms.txt': text('text/plain', '# Will Dzierson'),
  '/llms-full.txt': text('text/plain', '# Will Dzierson'),
  '/project/p1.md': text('text/markdown', '# A case study'),
  '/robots.txt': text('text/plain', 'User-agent: *'),
};

/** Serve `routes` locally and run the real check script against it. */
async function check(routes) {
  const server = http.createServer((req, res) => {
    const route = routes[req.url.split('?')[0]];
    res.writeHead(route ? 200 : 404, { 'content-type': route?.type ?? 'text/plain' }).end(route?.body ?? '');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    return await run('node', ['scripts/agent-pages/check.mjs', `http://127.0.0.1:${server.address().port}`]).then(r => ({ code: 0, out: r.stdout }), e => ({ code: e.code, out: e.stdout }));
  } finally { server.close(); }
}

test('passes when every page serves its own content', async () => {
  const result = await check(site);
  assert.equal(result.code, 0, result.out);
});

test('fails when a page falls back to the homepage, even though the homepage is full of text', async () => {
  const result = await check({ ...site, '/career': home, '/project/p1': home });
  assert.equal(result.code, 1, result.out);
  assert.match(result.out, /\/career/);
  assert.match(result.out, /\/project\/p1/);
});
