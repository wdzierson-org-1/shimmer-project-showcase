import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// The Stash film's timeline is pure data and math, so its promises can be checked without a
// browser: every frame is a function of time, the ground only changes behind a wipe, the dots only
// cut while invisible, captions stay up long enough to read, and the numbers on screen are the code's.
function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', code)((name) => assert.fail(`Unexpected import: ${name}`), module, module.exports);
  return module.exports;
}
const T = load('src/concepts/practice/stash/reel/timeline.ts');
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

test('captions stay up long enough to read', () => {
  const tooFast = [];
  for (const scene of SCENES) {
    scene.captions.forEach((caption, i) => {
      const until = i + 1 < scene.captions.length ? scene.captions[i + 1].at : scene.dur;
      const rate = (caption.kicker.length + caption.text.length) / (until - caption.at);
      if (rate > 20) tooFast.push(`${scene.id} at ${caption.at}: ${rate.toFixed(0)} characters a second`);
    });
  }
  assert.deepEqual(tooFast, []);
});

test('at most two scenes are on screen, and a scene only lingers for its own overlap', () => {
  for (let t = 0; t <= TOTAL; t += STEP) {
    const mounted = T.mountedAt(t);
    const current = T.sceneIndexAt(t);
    assert.ok(mounted.includes(current));
    assert.ok(mounted.length <= 2, `at ${t.toFixed(2)}`);
    for (const i of mounted) if (i !== current) assert.ok(t < SCENES[i].start + SCENES[i].dur + SCENES[i].post);
  }
});

test('the camera moves smoothly inside a scene and stays between its widest and closest zoom', () => {
  for (const scene of SCENES) {
    let previous = T.cameraOf(scene, 0);
    for (let local = STEP; local <= scene.dur; local += STEP) {
      const cam = T.cameraOf(scene, local);
      const moved = Math.hypot(cam.x - previous.x, cam.y - previous.y) * cam.zoom;
      assert.ok(moved < 40, `${scene.id} at ${local.toFixed(2)} moved ${moved.toFixed(1)} px in a frame`);
      assert.ok(Math.abs(cam.zoom / previous.zoom - 1) < 0.1, `${scene.id} at ${local.toFixed(2)} zoom jumped`);
      assert.ok(cam.zoom >= 1 && cam.zoom <= T.NEAR, `${scene.id} zoom ${cam.zoom}`);
      previous = cam;
    }
    const last = scene.cam[scene.cam.length - 1];
    assert.deepEqual(T.cameraOf(scene, scene.dur), { x: last.x, y: last.y, zoom: last.zoom });
  }
});

test('the trip through the machine leaves the card and returns to it at the same distance', () => {
  const save = T.scene('save'), enriched = T.scene('enriched');
  const out = save.cam[save.cam.length - 1], back = enriched.cam[0];
  assert.equal(out.zoom, T.NEAR);
  assert.equal(back.zoom, T.NEAR);
  // In both scenes the camera is centred on the card.
  assert.equal(out.x, T.SAVED.x + T.SAVED.w / 2);
  assert.equal(back.x, T.CARD.x + T.CARD.w / 2);
  assert.equal(out.y - T.SAVED.y, back.y - T.CARD.y);
});

test('the ground only changes by a wipe that starts on the old ground and ends on the new one', () => {
  let previous = T.groundAt(0);
  assert.deepEqual(previous, { a: 'lime', b: 'lime', p: 1 });
  for (let t = STEP; t <= TOTAL; t += STEP) {
    const ground = T.groundAt(t);
    const i = T.sceneIndexAt(t);
    // What is showing once any wipe has finished is the current scene's ground, or the next one's just before it.
    if (ground.a === ground.b) assert.equal(ground.b, SCENES[i].ground, `at ${t.toFixed(2)}`);
    else {
      // A wipe runs from the outgoing scene's ground to the incoming one's.
      const next = t < SCENES[i].start + 1 ? i : i + 1;
      assert.deepEqual([ground.a, ground.b], [SCENES[next - 1].ground, SCENES[next].ground], `at ${t.toFixed(2)}`);
      assert.ok(ground.p >= 0 && ground.p <= 1);
      if (previous.a === previous.b) assert.ok(ground.p < 0.05, `the wipe at ${t.toFixed(2)} starts from nothing (${ground.p.toFixed(3)})`);
      else assert.ok(ground.p >= previous.p, `the wipe at ${t.toFixed(2)} only grows`);
    }
    if (previous.a !== previous.b && ground.a === ground.b) assert.ok(previous.p > 0.95, `the wipe before ${t.toFixed(2)} finished (${previous.p.toFixed(3)})`);
    previous = ground;
  }
});

test('the dots are a function of time, and only change formation abruptly while invisible', () => {
  // Asking for other moments in between must not change what a moment looks like.
  const before = T.particlesAt(31.7);
  T.particlesAt(80); T.particlesAt(2); T.particlesAt(31.8);
  assert.deepEqual(T.particlesAt(31.7), before);
  let previous = T.particlesAt(0);
  for (let t = STEP; t <= TOTAL; t += STEP) {
    const state = T.particlesAt(t);
    assert.ok(state.p >= 0 && state.p <= 1 && state.alpha >= 0 && state.alpha <= 1);
    // A cut is a new pair of formations that the last frame was not already heading for.
    const continuous = state.a === previous.a || state.a === previous.b;
    if (!continuous) assert.ok(state.alpha < 0.01 && previous.alpha < 0.01, `a visible cut at ${t.toFixed(2)}: ${previous.b} to ${state.a}`);
    assert.ok(Math.abs(state.alpha - previous.alpha) < 0.12, `opacity jumps at ${t.toFixed(2)}`);
    previous = state;
  }
  // The film ends on the wordmark, fully drawn, which is also the poster.
  const end = T.particlesAt(TOTAL - 0.5);
  assert.equal(end.b, 'mark');
  assert.equal(end.p, 1);
  assert.equal(end.alpha, 1);
});

test('the pipeline’s stations happen in order, inside its captions', () => {
  const B = T.BEAT, scene = T.scene('pipeline');
  const order = [B.save, B.response, B.read, B.evidence, B.write, B.review, B.index, B.embed, B.settle, B.done, B.later];
  for (let i = 1; i < order.length; i++) assert.ok(order[i] > order[i - 1]);
  assert.ok(B.later + 1.2 < scene.dur);
  // Each numbered caption arrives with its stage.
  const at = (kicker) => scene.captions.find((c) => c.kicker.includes(kicker)).at;
  assert.equal(at('Read'), B.read);
  assert.equal(at('Write'), B.write);
  assert.equal(at('Index'), B.index);
  assert.equal(at('Settle'), B.settle);
  // Every check ticks before the save is called complete.
  assert.equal(T.SETTLE.length, 5);
  assert.ok(T.settleAt(T.SETTLE.length - 1) < B.done);
});

test('the system diagram is one connected graph that fits the frame, and its trace follows its edges', () => {
  const ids = new Set(T.NODES.map((n) => n.id));
  for (const [from, to] of T.EDGES) assert.ok(ids.has(from) && ids.has(to));
  const seen = new Set([T.NODES[0].id]);
  for (let grew = true; grew;) {
    grew = false;
    for (const [from, to] of T.EDGES) {
      if (seen.has(from) !== seen.has(to)) { seen.add(from); seen.add(to); grew = true; }
    }
  }
  assert.equal(seen.size, T.NODES.length);
  assert.equal(T.NODES.filter((n) => n.hub).length, 1);
  for (const node of T.NODES) assert.ok(node.x > 100 && node.x < W - 100 && node.y > 90 && node.y < H - 110, `${node.id} is clear of the edges and the caption`);
  // The trace follows real edges, each step starting from a node it has already reached.
  const reached = new Set([T.TRACE[0][0]]);
  for (const [from, to] of T.TRACE) {
    assert.ok(T.EDGES.some(([p, q]) => p === from && q === to), `${from} to ${to} is an edge`);
    assert.ok(reached.has(from), `${from} was reached before the trace leaves it`);
    reached.add(to);
  }
  // A save goes through an edge function before it reaches the database (capture, then add-url, does the insert).
  assert.deepEqual(T.TRACE.slice(0, 2), [['ios', 'edge'], ['edge', 'base']]);
});

test('text decrypts from nothing to itself', () => {
  assert.equal(T.decrypt('Tomato', 0.9, 1, 0.8), '');
  assert.equal(T.decrypt('Tomato', 1.8, 1, 0.8), 'Tomato');
  const mid = T.decrypt('Tomato & mozzarella penne', 1.4, 1, 0.8);
  assert.equal(mid.length, 25);
  assert.ok(mid.startsWith('Tomato & mo'));
  assert.notEqual(mid, 'Tomato & mozzarella penne');
  assert.equal(mid, T.decrypt('Tomato & mozzarella penne', 1.4, 1, 0.8));
});

test('the story’s details agree with each other', () => {
  assert.equal(T.STORY.ingredients.length, 5);
  assert.ok(T.STORY.onScreen.includes('5 INGREDIENTS'));
  assert.ok(T.STORY.url.endsWith(T.STORY.short));
  assert.ok(T.STORY.prompt.length / 26 < 2.4, 'the prompt can be typed before it is sent');
});

test('no scene gives an element its own style beside an animation, where the animation would replace it', () => {
  const dir = 'src/concepts/practice/stash/reel/scenes';
  const lost = [];
  for (const name of fs.readdirSync(dir)) {
    fs.readFileSync(`${dir}/${name}`, 'utf8').split('\n').forEach((line, i) => {
      // a() returns a style prop. An element's own styles go in as its fourth argument.
      for (const tag of line.match(/<[a-zA-Z][^<]*?\{\.\.\.a\([^<]*?>/g) ?? []) {
        if (/\sstyle=\{/.test(tag) && !/\{\.\.\.a\([^>]*,\s*\{[^>]*\}\)\}/.test(tag)) lost.push(`${name}:${i + 1}`);
      }
    });
  }
  assert.deepEqual(lost, []);
});

test('every scene clears itself off the screen by its last frame', () => {
  // A scene unmounts at its end, so everything in it must sit inside a wrapper whose exit ends by then.
  const dir = 'src/concepts/practice/stash/reel/scenes';
  const source = fs.readdirSync(dir).map((name) => fs.readFileSync(`${dir}/${name}`, 'utf8')).join('\n');
  const exits = { hook: 'Hook', save: 'Save', pipeline: 'Pipeline', enriched: 'Enriched', kinds: 'Kinds', ask: 'Ask', ai: 'Assistant', system: 'System' };
  for (const [id, component] of Object.entries(exits)) {
    const body = source.slice(source.indexOf(`export function ${component}(`));
    const end = body.indexOf('\nexport ', 10);
    const text = end > 0 ? body.slice(0, end) : body;
    const outs = [...text.matchAll(/a\('out', ([\d.]+), ([\d.]+)\)/g)].map((m) => Number(m[1]) + Number(m[2]));
    assert.ok(outs.length > 0, `${component} has an exit`);
    const last = Math.max(...outs);
    assert.ok(last <= T.scene(id).dur + 1e-9 && last >= T.scene(id).dur - 0.6, `${component} exits at ${last}, and the scene is ${T.scene(id).dur} s long`);
    // Nothing is drawn straight into the world or the HUD beside that wrapper.
    for (const block of text.matchAll(/<(World|Hud)>\s*\n\s*<(\w+)([^>]*)>/g)) {
      assert.ok(/a\('out'/.test(block[3]), `${component}: the first child of <${block[1]}> carries the exit`);
    }
  }
});
