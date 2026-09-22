import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const code = ts.transpileModule(await fs.readFile('src/portfolio-route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { portfolioDestination } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('root and old preview links preserve their query and hash', () => {
  assert.equal(portfolioDestination('/'), '/');
  assert.equal(portfolioDestination('/', '?utm_source=linkedin', '#ask'), '/?utm_source=linkedin#ask');
  assert.equal(portfolioDestination('/practice.html', '', '#case=abc'), '/#case=abc');
});
test('old public links open the equivalent portfolio view', () => {
  assert.equal(portfolioDestination('/projects/'), '/#projects');
  assert.equal(portfolioDestination('/about'), '/#practice');
  assert.equal(portfolioDestination('/project/cc5b34e1-e0a7-4a59-b3b6-c9e814585c34'), '/#case=cc5b34e1-e0a7-4a59-b3b6-c9e814585c34');
});
test('CMS, authentication, content, and unknown paths stay with the existing router', () => {
  for (const path of ['/admin', '/admin/projects', '/admin/project/abc', '/login', '/auth', '/entries', '/content/abc', '/missing']) {
    assert.equal(portfolioDestination(path), null, path);
  }
});
test('the island game keeps its own route in the existing router', async () => {
  assert.equal(portfolioDestination('/experienceoasis'), null);
  assert.equal(portfolioDestination('/experienceoasis/'), null);
  const app = await fs.readFile('src/App.tsx', 'utf8');
  assert.match(app, /path="\/experienceoasis"/, 'App.tsx declares the /experienceoasis route');
});
