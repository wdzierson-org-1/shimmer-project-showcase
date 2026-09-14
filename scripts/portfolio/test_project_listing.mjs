import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const code = ts.transpileModule(await fs.readFile('src/lib/projectListing.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { listedProjects, chatProjects } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

const listed = { id: 'listed', unlisted: false };
const legacy = { id: 'legacy' };
const unlisted = { id: 'unlisted', unlisted: true };

test('listings drop unlisted projects but keep rows without the flag', () => {
  assert.deepEqual(listedProjects([listed, unlisted, legacy]), [listed, legacy]);
});

test('an unlisted project stays reachable for its own conversation only', () => {
  assert.deepEqual(chatProjects([listed, unlisted, legacy], unlisted), [listed, legacy, unlisted]);
  assert.deepEqual(chatProjects([listed, unlisted, legacy], listed), [listed, legacy]);
  assert.deepEqual(chatProjects([listed, unlisted, legacy], undefined), [listed, legacy]);
});
