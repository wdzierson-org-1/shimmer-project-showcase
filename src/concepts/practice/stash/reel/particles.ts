import * as THREE from 'three';
import { WORDMARK } from './kit';
import { D0, FOV, groundAt, H, NODES, particlesAt, PL, seeded, W, type Camera, type Formation, type Ground } from './timeline';

/* The WebGL layer behind the DOM scenes, in Stash's own textures. It draws the ground (lime, paper or
   black) and wipes between them with halftone dots; the halftone pool along the bottom of the lime
   scenes; and one set of dots that runs through the film: the saved link, the words recovered from it,
   the evidence, the chunks, the vectors, the system, and at the end the wordmark set in halftone.
   Each frame is a function of time alone, so seeking is exact. */

const COUNT = 2600;
const COLORS: Record<Ground, [number, number, number]> = { lime: [0.639, 0.961, 0.231], paper: [0.953, 0.957, 0.945], ink: [0, 0, 0] };
/** Where the wordmark sits on the closing card, and the pitch of its halftone. */
const MARK = { x: 96, y: 404, w: 1088, pitch: 11.2 };

/** Canvas px (origin top left, y down) to world units (origin at the canvas centre, y up). */
const wx = (x: number) => x - W / 2;
const wy = (y: number) => H / 2 - y;

interface Built { forms: Record<Formation, Float32Array>; sizes: Record<Formation, number>; seeds: Float32Array; order: Float32Array }

/** The wordmark as halftone: a dot wherever a hexagonal grid lands on a letter. */
function markDots(): [number, number][] {
  const k = MARK.w / 3095.4, h = Math.ceil(730 * k), scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = MARK.w * scale; canvas.height = h * scale;
  const c = canvas.getContext('2d', { willReadFrequently: true });
  const dots: [number, number][] = [];
  if (!c) return dots;
  c.fillStyle = '#fff';
  for (const [x, d] of WORDMARK) {
    // The same transforms as the SVG: its letters are drawn with y running up.
    c.setTransform(scale * k, 0, 0, -scale * k, scale * k * (2 - 42.814 + x), scale * k * (2 + 713.012));
    c.fill(new Path2D(d), 'evenodd');
  }
  const data = c.getImageData(0, 0, canvas.width, canvas.height).data;
  const dy = MARK.pitch * 0.866;
  for (let row = 0; row * dy < h; row++) {
    for (let col = 0; col * MARK.pitch < MARK.w; col++) {
      const x = col * MARK.pitch + (row % 2 ? MARK.pitch / 2 : 0), y = row * dy + dy / 2;
      const px = Math.min(canvas.width - 1, Math.round(x * scale)), py = Math.min(canvas.height - 1, Math.round(y * scale));
      if (data[(py * canvas.width + px) * 4 + 3] > 128) dots.push([MARK.x + x, MARK.y + y]);
    }
  }
  return dots;
}

function build(): Built {
  const rnd = seeded(20261113);
  const seeds = new Float32Array(COUNT * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = rnd();
  const make = (place: (i: number) => [number, number, number?]) => {
    const out = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) { const [x, y, z = 0] = place(i); out[i * 3] = wx(x); out[i * 3 + 1] = wy(y); out[i * 3 + 2] = z; }
    return out;
  };
  const grid = (n: number) => Math.round(n / 4) * 4;
  const { read, evidence, index } = PL;

  const pool = make(() => [-80 + rnd() * (W + 160), 590 + rnd() * 190, 0]);
  // The link: a strip of pixels under the tag it was saved as.
  const link = make(() => [grid(150 + rnd() * 470), grid(232 + rnd() * 10), 0]);
  // What was said: the lines of the transcript, filling left to right.
  const speech = make((i) => {
    const row = i % 4, share = [0.92, 0.78, 0.86, 0.6][row];
    return [read.speech.x + 13 + rnd() * (read.speech.w - 26) * share, read.speech.y + 43 + row * 18 + (rnd() - 0.5) * 5, 0];
  });
  // The evidence: everything that was read, drawn up around the document.
  const frame = make(() => {
    const side = rnd(), t = rnd(), pad = 9 + rnd() * 5;
    const x0 = evidence.x - pad, y0 = evidence.y - pad, x1 = evidence.x + evidence.w + pad, y1 = evidence.y + evidence.h + pad;
    return side < 0.3 ? [x0 + t * (x1 - x0), y0] : side < 0.6 ? [x0 + t * (x1 - x0), y1] : side < 0.8 ? [x0, y0 + t * (y1 - y0)] : [x1, y0 + t * (y1 - y0)];
  });
  const chunkY = (row: number) => index.chunks.y + row * index.chunks.dy;
  const chunks = make((i) => [grid(index.chunks.x + 76 + rnd() * 64), chunkY(i % 4) + 9 + grid(rnd() * 16), 0]);
  const vectors = make((i) => {
    const row = i % 4, col = Math.floor(rnd() * index.vectors.cols);
    return [index.vectors.x + col * 10 + 4, chunkY(row) + 6 + rnd() * 22, 0];
  });
  const gone = make((i) => [index.vectors.x + 420 + rnd() * 500, chunkY(i % 4) + 17 + (rnd() - 0.5) * 60, 0]);
  // The system: a ring of dots around every node, the hub's the widest.
  const nodes = make(() => {
    const node = NODES[Math.floor(rnd() * NODES.length)];
    const angle = rnd() * Math.PI * 2, reach = (node.hub ? 1.7 : 1) * (0.92 + rnd() * 0.5);
    return [node.x + Math.cos(angle) * 104 * reach, node.y + Math.sin(angle) * 40 * reach, 0];
  });
  const dots = markDots();
  const mark = make((i) => (dots.length ? [dots[i % dots.length][0], dots[i % dots.length][1], 0] : [MARK.x + rnd() * MARK.w, MARK.y + rnd() * 250, 0]));

  const order = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) order[i] = rnd();
  return {
    forms: { pool, link, speech, evidence: frame, chunks, vectors, gone, nodes, mark },
    sizes: { pool: 5, link: 3, speech: 3, evidence: 3, chunks: 3, vectors: 3, gone: 3, nodes: 3, mark: 9.4 },
    seeds, order,
  };
}

const POINTS_VERTEX = /* glsl */ `
  uniform float uP, uStagger, uTurb, uTime, uPx, uD0, uSizeA, uSizeB, uAlpha;
  attribute vec3 aB;
  attribute vec4 aSeed;
  attribute float aOrder;
  varying float vAlpha;
  void main() {
    float p = clamp(uP * (1.0 + uStagger) - aOrder * uStagger, 0.0, 1.0);
    float q = p * p * (3.0 - 2.0 * p);
    float flight = sin(p * 3.14159265);
    vec3 pos = mix(position, aB, q);
    vec3 drift = vec3(sin(aSeed.x * 43.0 + uTime * 0.8 + q * 4.0), cos(aSeed.y * 37.0 + uTime * 0.9 + q * 3.0), 0.0);
    pos += drift * uTurb * flight;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float persp = uD0 / max(1.0, -mv.z);
    gl_PointSize = clamp(mix(uSizeA, uSizeB, q) * persp * uPx, 1.0, 128.0);
    vAlpha = uAlpha;
  }
`;
const POINTS_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uRound;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float disc = 1.0 - smoothstep(0.42, 0.5, d);
    gl_FragColor = vec4(uColor, mix(1.0, disc, uRound) * vAlpha);
  }
`;
const BACK_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const BACK_FRAGMENT = /* glsl */ `
  uniform vec2 uRes;
  uniform vec3 uA, uB;
  uniform float uWipe, uPool, uTime, uPx;
  varying vec2 vUv;
  void main() {
    // Stage px with the origin top left, in canvas units: the picture is always 720 tall.
    vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uRes / uPx;
    float soft = 0.75 / uPx;
    vec3 col = uA;
    // The halftone pool: rows of ink dots that swell and thin as a slow wave passes through them.
    float depth = smoothstep(${(H * 0.6).toFixed(1)}, ${(H * 0.96).toFixed(1)}, px.y);
    vec2 cell = vec2(13.0, 13.0);
    vec2 id = floor(px / cell);
    vec2 at = (id + 0.5) * cell;
    float wave = 0.5 + 0.5 * sin(at.x * 0.011 + uTime * 0.7 + 1.6 * sin(at.y * 0.021 - uTime * 0.45));
    float swell = 0.5 + 0.5 * sin(at.x * 0.004 - uTime * 0.3);
    float radius = cell.x * 0.52 * depth * (0.35 + 0.65 * wave * (0.6 + 0.4 * swell)) * uPool;
    col = mix(col, vec3(0.0), (1.0 - smoothstep(radius - soft, radius + soft, length(px - at))) * step(0.01, radius));
    // The wipe to the next ground: its dots grow from one corner until they close over this one.
    vec2 wcell = vec2(30.0, 30.0);
    vec2 wat = (floor(px / wcell) + 0.5) * wcell;
    float lead = clamp(uWipe * 1.7 - (wat.x / (uRes.x / uPx) + wat.y / ${H.toFixed(1)}) * 0.35, 0.0, 1.0);
    float wr = wcell.x * 0.74 * lead;
    col = mix(col, uB, (1.0 - smoothstep(wr - soft, wr + soft, length(px - wat))) * step(0.001, lead));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createStage3D(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, W / H, 8, 9000);
  let built: Built;
  try { built = build(); } catch (error) { renderer.dispose(); renderer.forceContextLoss(); throw error; }

  const back = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    vertexShader: BACK_VERTEX, fragmentShader: BACK_FRAGMENT, depthTest: false, depthWrite: false,
    uniforms: {
      uRes: { value: new THREE.Vector2(W, H) }, uA: { value: new THREE.Vector3(...COLORS.lime) }, uB: { value: new THREE.Vector3(...COLORS.lime) },
      uWipe: { value: 0 }, uPool: { value: 0 }, uTime: { value: 0 }, uPx: { value: 1 },
    },
  }));
  back.frustumCulled = false; back.renderOrder = -2;

  const geometry = new THREE.BufferGeometry();
  const from = new THREE.BufferAttribute(new Float32Array(built.forms.pool), 3);
  const to = new THREE.BufferAttribute(new Float32Array(built.forms.pool), 3);
  from.setUsage(THREE.DynamicDrawUsage); to.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', from);
  geometry.setAttribute('aB', to);
  geometry.setAttribute('aOrder', new THREE.BufferAttribute(built.order, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(built.seeds, 4));
  const material = new THREE.ShaderMaterial({
    vertexShader: POINTS_VERTEX, fragmentShader: POINTS_FRAGMENT, transparent: true, depthTest: false, depthWrite: false,
    uniforms: {
      uP: { value: 1 }, uStagger: { value: 0 }, uTurb: { value: 0 }, uTime: { value: 0 }, uPx: { value: 1 }, uD0: { value: D0 },
      uSizeA: { value: 3 }, uSizeB: { value: 3 }, uAlpha: { value: 0 }, uRound: { value: 0 }, uColor: { value: new THREE.Vector3(0, 0, 0) },
    },
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(back, points);

  let a: Formation = 'pool', b: Formation = 'pool';
  const u = material.uniforms, bu = back.material.uniforms;

  function resize(width: number, height: number) {
    if (width < 1 || height < 1) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    // Drawing-buffer px per canvas px at zoom 1: the canvas is always 720 tall on screen.
    const px = height / H * renderer.getPixelRatio();
    u.uPx.value = px; bu.uPx.value = px;
    renderer.getDrawingBufferSize(bu.uRes.value);
  }

  /** Paint second `time` of the film through `cam`. `breath` keeps the idle poster alive without advancing the story. */
  function draw(time: number, cam: Camera, breath = 0) {
    const state = particlesAt(time);
    if (state.a !== a) { a = state.a; from.array.set(built.forms[a]); from.needsUpdate = true; }
    if (state.b !== b) { b = state.b; to.array.set(built.forms[b]); to.needsUpdate = true; }
    const ground = groundAt(time);
    const onInk = (ground.p > 0.5 ? ground.b : ground.a) === 'ink';
    u.uP.value = state.p; u.uStagger.value = state.stagger; u.uTurb.value = state.turb; u.uTime.value = time + breath;
    u.uSizeA.value = built.sizes[a]; u.uSizeB.value = built.sizes[b];
    u.uAlpha.value = state.alpha; u.uRound.value = onInk ? 0 : 1;
    if (onInk) u.uColor.value.set(...COLORS.lime); else u.uColor.value.set(0, 0, 0);
    points.visible = state.alpha > 0.002;

    bu.uA.value.set(...COLORS[ground.a]); bu.uB.value.set(...COLORS[ground.b]);
    bu.uWipe.value = ground.a === ground.b ? 0 : ground.p; bu.uPool.value = state.pool; bu.uTime.value = time + breath;

    camera.position.set(wx(cam.x), wy(cam.y), D0 / cam.zoom);
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
  }

  /** Free everything. `release` also gives the WebGL context back at once (browsers allow only a few). */
  function dispose(release = true) {
    geometry.dispose(); back.geometry.dispose();
    material.dispose(); back.material.dispose();
    renderer.dispose();
    if (release) renderer.forceContextLoss();
  }

  return { draw, resize, dispose };
}

export type Stage3D = ReturnType<typeof createStage3D>;
