import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// The Gisted reel's timeline is pure data and math, so the film's promises can be checked
// without a browser: every frame is a function of time, cuts hide behind black or zero opacity,
// and the pipeline's choreography stays in step with itself.
function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', code)((name) => assert.fail(`Unexpected import: ${name}`), module, module.exports);
  return module.exports;
}
const T = load('src/concepts/practice/gisted/reel/timeline.ts');
const { SCENES, TOTAL, W, H } = T;
const STEP = 1 / 60;

test('scenes run end to end with no gaps, and each has a still and captions inside it', () => {
  let start = 0;
  for (const scene of SCENES) {
    assert.equal(scene.start, start, `${scene.id} starts where the last one ended`);
    assert.ok(scene.still > 0 && scene.still < scene.dur, `${scene.id} still is inside the scene`);
    assert.ok(scene.alt.length > 40, `${scene.id} is described for the transcript`);
    let last = -1;
    for (const caption of scene.captions) {
      assert.ok(caption.at > last && caption.at < scene.dur, `${scene.id} caption at ${caption.at}`);
      assert.ok(caption.text.length <= 110, `${scene.id} caption fits two lines: "${caption.text}"`);
      last = caption.at;
    }
    start += scene.dur;
  }
  assert.equal(TOTAL, start);
  assert.equal(T.sceneIndexAt(0), 0);
  assert.equal(T.sceneIndexAt(TOTAL), SCENES.length - 1);
  SCENES.forEach((scene, i) => {
    assert.equal(T.sceneIndexAt(scene.start), i);
    assert.equal(T.sceneIndexAt(scene.start + scene.dur - 0.001), i);
  });
});

test('at most two scenes are on screen, and a scene only lingers for its own overlap', () => {
  for (let t = 0; t <= TOTAL; t += STEP) {
    const mounted = T.mountedAt(t);
    const current = T.sceneIndexAt(t);
    assert.ok(mounted.includes(current));
    assert.ok(mounted.length <= 2, `at ${t.toFixed(2)}`);
    for (const i of mounted) if (i !== current) assert.ok(t < SCENES[i].start + SCENES[i].dur + SCENES[i].post);
  }
  // The findings stay up underneath the editor as it fades in over them.
  const board = T.scene('board'), customize = T.scene('customize');
  assert.ok(board.post > 0);
  assert.deepEqual(T.mountedAt(customize.start + board.post / 2), [T.sceneIndexAt(board.start), T.sceneIndexAt(customize.start)]);
});

test('the camera moves smoothly inside a scene and never loses the canvas', () => {
  for (const scene of SCENES) {
    let previous = T.cameraOf(scene, 0);
    assert.deepEqual(T.cameraOf(scene, -5), previous, `${scene.id} holds before it begins`);
    for (let t = STEP; t <= scene.dur; t += STEP) {
      const cam = T.cameraOf(scene, t);
      assert.ok(cam.zoom > 0.3 && cam.zoom <= T.DIVE && Number.isFinite(cam.x + cam.y), `${scene.id} at ${t.toFixed(2)}`);
      // A frame never jumps the picture by more than a sliver of the screen, or the zoom by more than a tenth.
      const shift = Math.hypot(cam.x - previous.x, cam.y - previous.y) * cam.zoom;
      assert.ok(shift < 40, `${scene.id} pans ${shift.toFixed(1)}px in one frame at ${t.toFixed(2)}`);
      assert.ok(Math.abs(Math.log(cam.zoom / previous.zoom)) < 0.1, `${scene.id} zoom jump at ${t.toFixed(2)}`);
      previous = cam;
    }
    assert.deepEqual(T.cameraOf(scene, scene.dur + 5), T.cameraOf(scene, scene.dur), `${scene.id} holds after it ends`);
  }
});

test('the dive into the source card and the way back out meet in the same black frame', () => {
  const paste = T.scene('paste'), board = T.scene('board');
  const into = T.cameraOf(paste, paste.dur), out = T.cameraOf(board, 0);
  assert.deepEqual(into, out);
  assert.deepEqual([into.x, into.y, into.zoom], [T.THUMB.x, T.THUMB.y, T.DIVE]);
  // At that zoom the card's picture covers a stage four times wider than it is tall.
  assert.ok(T.ITEM.w * T.DIVE >= H * 4);
  assert.ok(T.ITEM.media * T.DIVE >= H);
  // And the backdrop is fully dark across the whole pipeline in between.
  const pipeline = T.scene('pipeline');
  for (let t = pipeline.start; t <= pipeline.start + pipeline.dur; t += 0.25) assert.equal(T.backdropAt(t).engine, 1);
  assert.equal(T.backdropAt(paste.start + 2).engine, 0);
  assert.equal(T.backdropAt(board.start + 2).engine, 0);
});

test('particles are a function of time alone: seeking and replay give the same frame', () => {
  const samples = [3.4, 14.2, 17.9, 22.6, 24.4, 29.1, 73, 80.6];
  const first = samples.map((t) => T.particlesAt(t));
  T.particlesAt(60); T.particlesAt(0); T.particlesAt(TOTAL);
  samples.forEach((t, i) => assert.deepEqual(T.particlesAt(t), first[i]));
  for (let t = 0; t <= TOTAL; t += STEP) {
    const s = T.particlesAt(t);
    for (const key of ['p', 'alpha', 'bulk', 'dash', 'magenta']) assert.ok(s[key] >= 0 && s[key] <= 1, `${key} at ${t.toFixed(2)}`);
  }
  assert.deepEqual(T.particlesAt(-3), T.particlesAt(0));
  assert.deepEqual(T.particlesAt(TOTAL + 3), T.particlesAt(TOTAL));
});

test('particles only change formation abruptly while they are invisible', () => {
  let previous = T.particlesAt(0);
  for (let t = STEP; t <= TOTAL; t += STEP) {
    const now = T.particlesAt(t);
    // A cut: the formation in hand is neither where the last frame was nor where it was heading.
    if (now.a !== previous.a && now.a !== previous.b) {
      assert.ok(previous.alpha < 0.01 && now.alpha < 0.01, `visible cut from ${previous.b} to ${now.a} at ${t.toFixed(2)}`);
    }
    previous = now;
  }
});

test('the particles are the link, then the spark, then the pipeline, the system, and the spark again', () => {
  const at = (id, local) => T.particlesAt(T.at(id, local));
  assert.equal(at('hook', 2.9).b, 'titleLink');
  assert.equal(at('hook', 2.9).alpha, 1);
  assert.equal(at('hook', 5.6).b, 'spark');
  assert.equal(at('paste', 3).alpha, 0);
  assert.equal(at('pipeline', 1).b, 'pipeLink');
  assert.equal(at('pipeline', 4).mode, 1, 'words take the route through the gate and the lanes');
  assert.equal(at('pipeline', 7).b, 'page');
  assert.equal(at('pipeline', 12).b, 'tiles');
  assert.ok(at('pipeline', 12).bulk < 1, 'the words the model did not keep step back');
  assert.equal(at('customize', 5).alpha, 0);
  assert.equal(at('system', 5).b, 'nodes');
  assert.equal(at('close', 4).b, 'spark');
  assert.ok(at('close', 4).magenta > 0.8);
});

test('the pipeline stays in step: the sweep, the objects it writes, and where they land', () => {
  const { PL, TILES, WRITE } = T;
  assert.equal(TILES.filter((t) => t.kind === 'finding').length, 7);
  assert.equal(TILES.filter((t) => t.kind === 'section').length, 4);
  assert.equal(TILES.filter((t) => t.kind === 'suggestion').length, 3);
  // Events arrive in the order the function sends them: findings, then sections, then suggestions.
  const order = TILES.map((t) => ['finding', 'section', 'suggestion'].indexOf(t.kind));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  let last = WRITE.t0;
  TILES.forEach((tile, i) => {
    const at = T.tileAt(i);
    assert.ok(at > last && at < WRITE.t1, `tile ${i} appears in turn, while the model is writing`);
    last = at;
  });
  assert.ok(T.SWEEP_END > WRITE.t0 && T.SWEEP_END < WRITE.t1);
  // The sweep is over the page exactly while the write is under way.
  const local = (t) => T.particlesAt(T.at('pipeline', t)).sweep;
  assert.ok(local(WRITE.t0 - 1) < -9000 && local(T.SWEEP_END + 1) < -9000);
  assert.ok(local(WRITE.t0 + 0.01) < PL.page.x + 1 && local(T.SWEEP_END) > PL.page.x + PL.page.w);
  // Objects sit in a grid between the model and the quality gate, without overlapping.
  const rects = TILES.map(T.tileRect);
  for (const [i, a] of rects.entries()) {
    assert.ok(a.x > PL.model.x + 40 && a.x + a.w < PL.check.x - PL.check.r);
    for (const b of rects.slice(i + 1)) assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  }
  assert.equal(PL.lanes.reduce((sum, lane) => sum + lane.share, 0), 1);
});

test('the system diagram is one connected graph, and the traced path follows real edges', () => {
  const ids = new Set(T.NODES.map((n) => n.id));
  assert.equal(T.NODES.filter((n) => n.hub).length, 1);
  for (const [from, to] of T.EDGES) assert.ok(ids.has(from) && ids.has(to));
  const reached = new Set([T.NODES.find((n) => n.hub).id]);
  for (let pass = 0; pass < T.NODES.length; pass++) for (const [a, b] of T.EDGES) { if (reached.has(a)) reached.add(b); if (reached.has(b)) reached.add(a); }
  assert.equal(reached.size, ids.size);
  for (let i = 1; i < T.TRACE.length; i++) assert.ok(T.EDGES.some(([a, b]) => a === T.TRACE[i - 1] && b === T.TRACE[i]), `${T.TRACE[i - 1]} → ${T.TRACE[i]}`);
  for (const n of T.NODES) assert.ok(n.x > 60 && n.x < W - 60 && n.y > 150 && n.y < H - 120, `${n.id} is inside the frame, clear of the caption`);
});

test('typing, captions and the numbers on screen are honest', () => {
  assert.equal(T.typed('abcdef', 0.9, 1, 10), '');
  assert.equal(T.typed('abcdef', 1.35, 1, 10), 'abc');
  assert.equal(T.typed('abcdef', 99, 1, 10), 'abcdef');
  // The post counter on the send step: the text plus X's 23-character link and a space.
  assert.equal(T.STORY.post.length + 24, 197);
  assert.equal(T.captionAt(T.at('hook', 3)), null);
  assert.equal(T.captionAt(T.at('pipeline', 9)).kicker, '3 · Write');
  assert.equal(T.captionAt(T.at('pipeline', 12)).kicker, '4 · Ground');
  assert.equal(T.formatTime(TOTAL), '01:25');
  for (const [time, x, y] of T.PULSES) assert.ok(time > 0 && time < TOTAL && x > 0 && x < W && y > 0 && y < H);
});
