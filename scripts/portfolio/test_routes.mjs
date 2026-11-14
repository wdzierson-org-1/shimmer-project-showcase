import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { portfolioDestination } from '../../src/portfolio-route.ts';
import { caseUrl, essayUrl, routeFromLocation, urlForRoute } from '../../src/concepts/practice/routes.ts';

test('root and old preview links preserve their query and hash', () => {
  assert.equal(portfolioDestination('/'), '/');
  assert.equal(portfolioDestination('/', '?utm_source=linkedin', '#ask'), '/?utm_source=linkedin#ask');
  assert.equal(portfolioDestination('/', '', '#practice'), '/#practice');
  assert.equal(portfolioDestination('/practice.html', '', '#case=abc'), '/project/abc');
});
test('old public links open the equivalent portfolio view', () => {
  assert.equal(portfolioDestination('/projects/'), '/#projects');
  assert.equal(portfolioDestination('/about'), '/#practice');
  assert.equal(portfolioDestination('/project/cc5b34e1-e0a7-4a59-b3b6-c9e814585c34'), '/project/cc5b34e1-e0a7-4a59-b3b6-c9e814585c34');
});
test('links shared before case pages had paths move to the shareable path', () => {
  assert.equal(portfolioDestination('/', '', '#case=abc'), '/project/abc');
  assert.equal(portfolioDestination('/', '?utm_source=linkedin', '#case=abc'), '/project/abc?utm_source=linkedin');
  assert.equal(portfolioDestination('/', '', '#essay=abc'), '/essay/abc');
  assert.equal(portfolioDestination('/', '', '#career'), '/career');
  assert.equal(portfolioDestination('/', '', '#career=all'), '/career');
  assert.equal(portfolioDestination('/', '', '#career=google'), '/career#google');
});
test('case, essay, and career paths open in the portfolio without a trailing slash', () => {
  assert.equal(portfolioDestination('/project/abc/'), '/project/abc');
  assert.equal(portfolioDestination('/essay/abc'), '/essay/abc');
  assert.equal(portfolioDestination('/career/'), '/career');
  assert.equal(portfolioDestination('/career', '', '#google'), '/career#google');
});
test('CMS, authentication, content, and unknown paths stay with the existing router', () => {
  for (const path of ['/admin', '/admin/projects', '/admin/project/abc', '/login', '/auth', '/entries', '/content/abc', '/missing', '/project', '/project/abc/edit']) {
    assert.equal(portfolioDestination(path), null, path);
  }
});
test('the island game keeps its own route in the existing router', async () => {
  assert.equal(portfolioDestination('/experienceoasis'), null);
  assert.equal(portfolioDestination('/experienceoasis/'), null);
  const app = await fs.readFile('src/App.tsx', 'utf8');
  assert.match(app, /path="\/experienceoasis"/, 'App.tsx declares the /experienceoasis route');
});

test('paths name their portfolio view', () => {
  assert.equal(routeFromLocation('/project/x', ''), 'case=x');
  assert.equal(routeFromLocation('/project/x/', ''), 'case=x');
  assert.equal(routeFromLocation('/essay/x', ''), 'essay=x');
  assert.equal(routeFromLocation('/career', ''), 'career');
  assert.equal(routeFromLocation('/career', '#google'), 'career=google');
  assert.equal(routeFromLocation('/', '#projects'), 'projects');
  assert.equal(routeFromLocation('/', ''), '');
});
test('an in-page anchor on a case page keeps the case open', () => {
  assert.equal(routeFromLocation('/project/x', '#main'), 'case=x');
});
test('old hash routes still resolve at runtime', () => {
  assert.equal(routeFromLocation('/', '#case=abc'), 'case=abc');
  assert.equal(routeFromLocation('/', '#essay=abc'), 'essay=abc');
});
test('views map to shareable URLs', () => {
  assert.equal(urlForRoute('case=x'), '/project/x');
  assert.equal(urlForRoute('essay=x'), '/essay/x');
  assert.equal(urlForRoute('career'), '/career');
  assert.equal(urlForRoute('career=all'), '/career');
  assert.equal(urlForRoute('career=google'), '/career#google');
  assert.equal(urlForRoute('projects'), '/#projects');
  assert.equal(urlForRoute('client=Included%20Health'), '/#client=Included%20Health');
  assert.equal(urlForRoute(''), '/');
  assert.equal(caseUrl('x'), '/project/x');
  assert.equal(essayUrl('x'), '/essay/x');
});
test('every view survives a round trip through its URL', () => {
  for (const route of ['case=x', 'essay=x', 'career', 'career=google', 'projects', 'client=Google', 'ask', 'ask=x', 'practice', '']) {
    const url = new URL(urlForRoute(route), 'https://dzierson.com');
    assert.equal(routeFromLocation(url.pathname, url.hash), route, route);
  }
});
