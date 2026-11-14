import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { build } from 'vite';
import { agentPages } from '../agent-pages/plugin.ts';

const shell = '<!DOCTYPE html><html><head><!-- page-meta --><title>x</title><!-- /page-meta --></head><body><div id="root"></div><script type="module" src="/main.js"></script></body></html>';
const data = { projects: [{ id: 'p1', title: 'A listed project', client: 'Client', year: 2020, description: 'About it.', involvement: null, liveurl: null, unlisted: false, tags: [], project_images: [], updated_at: null }], essays: [], settings: {} };

/** Build a throwaway Vite project with the plugin; the CMS read is replaced by `load`. */
async function buildProject(main, load) {
  // The real path matters on macOS, where the temp folder sits behind a /var → /private/var symlink.
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'vite-shell-')));
  await writeFile(path.join(root, 'index.html'), shell);
  await writeFile(path.join(root, 'main.js'), main);
  const run = build({ root, configFile: false, logLevel: 'silent', plugins: [agentPages({ load })], build: { outDir: 'dist', emptyOutDir: true } });
  return { root, run, cleanup: () => rm(root, { recursive: true, force: true }) };
}

test('a successful build writes the agent pages into its output', async () => {
  const project = await buildProject('console.log("app");', async () => data);
  try {
    await project.run;
    assert.match(await readFile(path.join(project.root, 'dist/project/p1/index.html'), 'utf8'), /A listed project/);
  } finally { await project.cleanup(); }
});

test('a build that fails on its own reports its own error and never reads the CMS', async () => {
  let reads = 0;
  const project = await buildProject('const broken = ;', async () => { reads++; return data; });
  try {
    await assert.rejects(project.run, error => {
      assert.notEqual(error?.plugin, 'agent-pages', `the app’s error is not replaced by an agent-pages error: ${error?.message}`);
      assert.doesNotMatch(String(error?.message), /^agent-pages:/);
      return true;
    });
    assert.equal(reads, 0);
  } finally { await project.cleanup(); }
});
