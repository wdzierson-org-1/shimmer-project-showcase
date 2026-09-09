import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function load(file, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    assert.ok(name in imports, `Unexpected import: ${name}`);
    return imports[name];
  }, module, module.exports);
  return module.exports;
}
const story = load('src/concepts/practice/arc/story.ts');
const { journeyFrame } = load('src/concepts/practice/arc/journeySequence.ts', { './story': story });

test('each finale image has time to assemble before the next transition', () => {
  const beats = [45, 46.8, 48.25, 49.85];
  beats.forEach((time, i) => {
    const start = journeyFrame(time + .000001), held = journeyFrame((beats[i + 1] ?? 52.15) - .01);
    assert.equal(start.to, 5 + i);
    assert.ok(start.mix < .00001);
    assert.equal(held.to, start.to);
    assert.equal(held.mix, 1);
    assert.equal(held.dissolve, 0);
    if (i > 0) assert.equal(start.from, journeyFrame(time - .000001).to);
  });
});

test('the question constellation holds, disperses, and completely leaves at the end of the score', () => {
  assert.equal(journeyFrame(51.5).to, 8);
  assert.equal(journeyFrame(51.5).mix, 1);
  assert.equal(journeyFrame(51.5).dissolve, 0);
  let previous = 0;
  for (let time = 52.15; time < story.DURATION; time += .01) {
    const frame = journeyFrame(time);
    assert.equal(frame.to, 8);
    assert.ok(frame.dissolve >= previous && frame.dissolve <= 1);
    previous = frame.dissolve;
  }
  assert.equal(journeyFrame(story.DURATION).dissolve, 1);
});

test('direct seeks and replay reset all finale state', () => {
  journeyFrame(54);
  assert.deepEqual(journeyFrame(0), { chapter: 0, from: 0, to: 0, mix: 0, dissolve: 0 });
  const time = 47.3, expected = journeyFrame(time);
  journeyFrame(53.8); journeyFrame(10); journeyFrame(49.9);
  assert.deepEqual(journeyFrame(time), expected);
  assert.equal(journeyFrame(40).to, 4);
  assert.equal(journeyFrame(40).dissolve, 0);
});

test('reduced motion keeps one visible interconnected form throughout the finale', () => {
  for (let time = 45; time <= story.DURATION; time += .1) {
    assert.deepEqual(journeyFrame(time, true), { chapter: 5, from: 7, to: 7, mix: 1, dissolve: 0 });
  }
  assert.equal(journeyFrame(story.DURATION, true).dissolve, 0);
  assert.equal(journeyFrame(36, true).mix, 1);
});
