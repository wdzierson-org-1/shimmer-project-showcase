import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const code = ts.transpileModule(await fs.readFile('src/lib/projectOrder.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { withProjectOrder, projectOrderUpdates } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('shared query uses the admin-saved field with stable ties and nulls last', () => {
  const calls = [];
  const query = { order(column, options) { calls.push({ column, ...options }); return this; } };
  assert.equal(withProjectOrder(query), query);
  assert.deepEqual(calls, [
    { column:'display_order', ascending:true, nullsFirst:false },
    { column:'created_at', ascending:false, nullsFirst:false },
    { column:'id', ascending:true },
  ]);
});

test('a global reorder resolves overlapping positions from the old featured lists', () => {
  const projects = [
    { id:'inside', displayOrder:0, featured:false },
    { id:'included', displayOrder:0, featured:true },
    { id:'noodle', displayOrder:0, featured:false },
    { id:'agentic', displayOrder:1, featured:true },
    { id:'dash', displayOrder:1, featured:false },
  ];
  const updates = projectOrderUpdates(projects);
  const persisted = projects.map(project => updates.find(update => update.id === project.id)?.display_order ?? project.displayOrder);
  assert.deepEqual(persisted, [0,1,2,3,4]);
  assert.equal(new Set(persisted).size, projects.length);
  assert.equal(updates.some(update => update.id === 'inside'), false);
});

test('moving the last project first updates every affected position without rewriting content', () => {
  assert.deepEqual(projectOrderUpdates([{ id:'c', displayOrder:2 }, { id:'a', displayOrder:0 }, { id:'b', displayOrder:1 }]), [
    { id:'c', display_order:0 }, { id:'a', display_order:1 }, { id:'b', display_order:2 },
  ]);
});

test('unchanged order sends no writes; unpositioned projects receive an explicit position', () => {
  assert.deepEqual(projectOrderUpdates([{ id:'a', displayOrder:0 }, { id:'b', displayOrder:1 }]), []);
  assert.deepEqual(projectOrderUpdates([{ id:'a', displayOrder:null }]), [{ id:'a', display_order:0 }]);
});
