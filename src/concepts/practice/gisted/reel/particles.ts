import * as THREE from 'three';
import {
  backdropAt, D0, FOV, H, NODES, particlesAt, PL, PULSES, seeded, TILES, tileRect, TITLE, W,
  type Camera, type Formation, type Order,
} from './timeline';

/* The WebGL layer behind the DOM scenes. One set of particles runs through the whole reel: it is
   the pasted link, then the spark, then every word the pipeline reads, then the few the model
   keeps, then the system, then the mark again. Each frame is a function of time alone (positions
   are computed in the vertex shader from two formations and a progress), so seeking is exact. */

export const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace";
const COUNT = 4800;
const PER_TILE = 36;
const KEPT = TILES.length * PER_TILE;
const DUST = 460;
const SPARK = 'M24 6.5C25.4 17.2 30.8 22.6 41.5 24 30.8 25.4 25.4 30.8 24 41.5 22.6 30.8 17.2 25.4 6.5 24 17.2 22.6 22.6 17.2 24 6.5Z';
const RAYS = 'M37.5 7.5l2.6-2.8M41 12.6l3.8-.9M33.6 4.6l.6-3';

/** Canvas px (origin top left, y down) to world units (origin at the canvas centre, y up). */
const wx = (x: number) => x - W / 2;
const wy = (y: number) => H / 2 - y;
const gauss = (rnd: () => number) => (rnd() + rnd() + rnd() + rnd() - 2) / 2;

/** Points scattered over whatever `paint` draws, in the painted canvas's own px. */
function inkPoints(w: number, h: number, n: number, rnd: () => number, paint: (c: CanvasRenderingContext2D) => void): Float32Array {
  const out = new Float32Array(n * 2);
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale; canvas.height = h * scale;
  const c = canvas.getContext('2d', { willReadFrequently: true });
  if (!c) return out;
  c.scale(scale, scale);
  c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineCap = 'round'; c.lineJoin = 'round';
  paint(c);
  const data = c.getImageData(0, 0, canvas.width, canvas.height).data;
  const ink: number[] = [];
  for (let i = 3, px = 0; i < data.length; i += 4, px++) if (data[i] > 110) ink.push(px);
  if (!ink.length) return out;
  for (let k = 0; k < n; k++) {
    const px = ink[Math.floor(rnd() * ink.length)];
    out[k * 2] = ((px % canvas.width) + rnd()) / scale;
    out[k * 2 + 1] = (Math.floor(px / canvas.width) + rnd()) / scale;
  }
  return out;
}

function textFormation(text: string, cx: number, cy: number, font: number, rnd: () => number) {
  const w = Math.ceil(text.length * font * 0.68) + 40, h = Math.ceil(font * 2);
  const points = inkPoints(w, h, COUNT, rnd, (c) => {
    c.font = `600 ${font}px ${MONO}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, w / 2, h / 2);
  });
  const out = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    out[i * 3] = wx(cx - w / 2 + points[i * 2]);
    out[i * 3 + 1] = wy(cy - h / 2 + points[i * 2 + 1]);
    out[i * 3 + 2] = gauss(rnd) * 3;
  }
  return out;
}

function sparkFormation(cx: number, cy: number, size: number, rnd: () => number) {
  const pad = 12, box = size + pad * 2, k = size / 48;
  const outline = inkPoints(box, box, COUNT, rnd, (c) => {
    c.translate(pad, pad); c.scale(k, k); c.lineWidth = 1.5;
    c.stroke(new Path2D(SPARK)); c.lineWidth = 1.3; c.stroke(new Path2D(RAYS));
  });
  const body = inkPoints(box, box, COUNT, rnd, (c) => { c.translate(pad, pad); c.scale(k, k); c.fill(new Path2D(SPARK)); });
  const out = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    // Most of the light sits on the drawn line; the rest gives the shape a faint body.
    const inside = rnd() < 0.24;
    const src = inside ? body : outline;
    out[i * 3] = wx(cx - box / 2 + src[i * 2]);
    out[i * 3 + 1] = wy(cy - box / 2 + src[i * 2 + 1]);
    out[i * 3 + 2] = gauss(rnd) * (inside ? 26 : 5);
  }
  return out;
}

interface Built {
  forms: Record<Formation, Float32Array>;
  /** How bright each particle is in each formation: a packed page would otherwise burn out to white. */
  gains: Record<Formation, Float32Array>;
  orders: Record<Order, Float32Array>;
  waypoints: Float32Array;
  seeds: Float32Array;
  lengths: Float32Array;
  roles: Float32Array;
}

function build(): Built {
  const rnd = seeded(20261111);
  const seeds = new Float32Array(COUNT * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = rnd();

  const titleLink = textFormation('youtube.com/watch?v=HQQtaWgIQmE', TITLE.link.x, TITLE.link.y, TITLE.link.font, rnd);
  const pipeLink = textFormation('youtube.com/watch?v=HQQtaWgIQmE', PL.link.x, PL.link.y, PL.link.font, rnd);
  const spark = sparkFormation(TITLE.spark.x, TITLE.spark.y, TITLE.spark.size, rnd);

  const scatter = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    scatter[i * 3] = wx(-500 + rnd() * (W + 1000));
    scatter[i * 3 + 1] = wy(-360 + rnd() * (H + 720));
    scatter[i * 3 + 2] = -900 + rnd() * 1150;
  }

  // The evidence document: pages of words, stacked into a slab.
  const { page } = PL;
  const slots: number[] = [];
  for (let layer = 0; layer < 8; layer++) {
    // Each sheet sits a little up and to the right of the one in front, like a stack of paper.
    const shift = layer * 5;
    for (let row = 0; row < 36; row++) {
      const y = page.y + 16 + row * 5.8 - shift;
      const end = page.x + page.w - 12 - (rnd() < 0.16 ? rnd() * 80 : 0) + shift;
      let x = page.x + 12 + (row % 9 === 0 ? 10 : 0) + shift;
      for (;;) {
        const len = 7 + rnd() * 14;
        if (x + len > end) break;
        slots.push(x + len / 2, y, -layer * 34, len);
        x += len + 3.6;
      }
    }
  }
  const slotCount = slots.length / 4;
  const pick = Array.from({ length: slotCount }, (_, i) => i);
  for (let i = pick.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pick[i], pick[j]] = [pick[j], pick[i]]; }
  const pageForm = new Float32Array(COUNT * 3), lengths = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const s = pick[i % slotCount] * 4;
    pageForm[i * 3] = wx(slots[s]); pageForm[i * 3 + 1] = wy(slots[s + 1]); pageForm[i * 3 + 2] = slots[s + 2];
    lengths[i] = slots[s + 3];
  }

  // The words the model keeps are the first KEPT particles. Left to right across the page, they
  // leave as the sweep passes them, and each run of them becomes the body text of one object.
  const roles = new Float32Array(COUNT);
  for (let i = KEPT; i < COUNT; i++) roles[i] = 1;
  const kept = Array.from({ length: KEPT }, (_, i) => i).sort((p, q) => pageForm[p * 3] - pageForm[q * 3]);
  const tiles = pageForm.slice(), tilesOut = pageForm.slice();
  kept.forEach((index, n) => {
    const rect = tileRect(TILES[Math.floor(n / PER_TILE)]);
    const k = n % PER_TILE, row = k % 3, col = Math.floor(k / 3);
    const x = rect.x + 14 + (col + rnd() * 0.5) * ((rect.w - 28) / 12) + lengths[index] * 0.2;
    const y = rect.y + 37 + row * 8.5;
    tiles[index * 3] = wx(x); tiles[index * 3 + 1] = wy(y); tiles[index * 3 + 2] = gauss(rnd) * 2;
    tilesOut[index * 3] = wx(x + 860 + rnd() * 240); tilesOut[index * 3 + 1] = wy(PL.y + (y - PL.y) * 0.35); tilesOut[index * 3 + 2] = gauss(rnd) * 30;
  });

  // The system: a glow of particles gathered at every node, the hub brightest.
  const nodes = new Float32Array(COUNT * 3);
  const weight = NODES.reduce((sum, node) => sum + node.weight, 0);
  for (let i = 0; i < COUNT; i++) {
    let roll = rnd() * weight, node = NODES[0];
    for (const candidate of NODES) { roll -= candidate.weight; if (roll <= 0) { node = candidate; break; } }
    // A halo just outside each label: an ellipse, densest at the label's edge and thinning outward.
    const reach = (node.hub ? 1.25 : 1) * Math.sqrt(node.weight);
    const angle = rnd() * Math.PI * 2, band = 0.86 + Math.abs(gauss(rnd)) * 0.75;
    nodes[i * 3] = wx(node.x + Math.cos(angle) * 84 * reach * band);
    nodes[i * 3 + 1] = wy(node.y + Math.sin(angle) * 34 * reach * band);
    nodes[i * 3 + 2] = gauss(rnd) * 50 - 20;
  }

  // The order particles set off in. The link empties toward the gate; the page empties under the sweep.
  const seed = new Float32Array(COUNT), queue = new Float32Array(COUNT), sweep = new Float32Array(COUNT);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < COUNT; i++) { lo = Math.min(lo, pipeLink[i * 3]); hi = Math.max(hi, pipeLink[i * 3]); }
  for (let i = 0; i < COUNT; i++) {
    seed[i] = rnd();
    queue[i] = 0.62 * (1 - (pipeLink[i * 3] - lo) / (hi - lo || 1)) + 0.38 * rnd();
    // The sheets behind are shifted right, past the page's edge: they leave with the last of the sweep.
    sweep[i] = Math.min(1, Math.max(0, (pageForm[i * 3] - wx(page.x)) / page.w));
  }

  // Where each word bends on its way from the gate to the page: down one of the two readers' lanes.
  const waypoints = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const lane = rnd() < PL.lanes[0].share ? PL.lanes[0] : PL.lanes[1];
    waypoints[i * 3] = wx(lane.cx + gauss(rnd) * 70);
    waypoints[i * 3 + 1] = wy(lane.cy + gauss(rnd) * 56);
    waypoints[i * 3 + 2] = gauss(rnd) * 90 - 40;
  }

  const flat = (value: number) => new Float32Array(COUNT).fill(value);
  const full = flat(1), packed = flat(0.36), kept1 = flat(0.36);
  for (let i = 0; i < KEPT; i++) kept1[i] = 1;

  return {
    forms: { titleLink, pipeLink, spark, scatter, page: pageForm, tiles, tilesOut, nodes },
    gains: { titleLink: full, pipeLink: full, spark: flat(0.8), scatter: full, page: packed, tiles: kept1, tilesOut: kept1, nodes: flat(1.25) },
    orders: { seed, queue, sweep }, waypoints, seeds, lengths, roles,
  };
}

const POINTS_VERTEX = /* glsl */ `
  uniform float uP, uStagger, uTurb, uMode, uTime, uPx, uD0, uDot, uThick, uDash, uAlpha, uBulk, uMagenta, uSweep;
  uniform vec3 uGate;
  attribute vec3 aB;
  attribute float aGainA;
  attribute float aGainB;
  attribute vec3 aW;
  attribute vec4 aSeed;
  attribute float aOrder;
  attribute float aLen;
  attribute float aRole;
  varying float vAlpha;
  varying float vAspect;
  varying float vDash;
  varying vec3 vColor;

  void main() {
    float p = clamp(uP * (1.0 + uStagger) - aOrder * uStagger, 0.0, 1.0);
    float flight = sin(p * 3.14159265);
    float dash = uDash;
    float gain = mix(aGainA, aGainB, smoothstep(0.55, 1.0, p));
    vec3 pos;
    if (uMode > 0.5) {
      // Through the admission gate, then down a reader's lane into the evidence.
      vec3 gate = uGate + (aSeed.xyz - 0.5) * vec3(16.0, 34.0, 44.0);
      if (p < 0.3) {
        float q = p / 0.3;
        pos = mix(position, gate, q * q);
      } else {
        float q = (p - 0.3) / 0.7;
        q = 1.0 - (1.0 - q) * (1.0 - q) * (1.0 - q);
        float r = 1.0 - q;
        pos = r * r * gate + 2.0 * r * q * aW + q * q * aB;
      }
      dash = smoothstep(0.24, 0.5, p);
    } else {
      float q = p * p * (3.0 - 2.0 * p);
      pos = mix(position, aB, q);
      vec3 drift = vec3(
        sin(aSeed.x * 43.0 + uTime * 0.8 + q * 4.0),
        cos(aSeed.y * 37.0 + uTime * 0.9 + q * 3.0),
        sin(aSeed.z * 29.0 + uTime * 0.7));
      pos += drift * uTurb * flight;
    }
    pos.xy += 0.5 * vec2(sin(uTime * 1.3 + aSeed.x * 50.0), cos(uTime * 1.1 + aSeed.y * 50.0)) * (1.0 - dash * 0.7);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float persp = uD0 / max(1.0, -mv.z);
    float len = mix(uDot, aLen, dash);
    gl_PointSize = clamp(len * persp * uPx * (1.0 + 0.7 * flight * (1.0 - dash)), 1.0, 96.0);
    vAspect = mix(1.0, uThick / aLen, dash);
    vDash = dash;

    float depth = clamp(1.0 + pos.z / 480.0, 0.2, 1.1);
    float lit = (1.0 - smoothstep(0.0, 30.0, abs(pos.x - uSweep))) * step(-9000.0, uSweep);
    float tint = step(aSeed.z, uMagenta);
    vColor = mix(vec3(1.0, 0.965, 0.9), vec3(0.973, 0.11, 0.898), max(tint, lit));
    vAlpha = uAlpha * gain * mix(1.0, uBulk, aRole) * depth * (0.55 + 0.45 * aSeed.x) * (1.0 + lit * 2.2);
  }
`;
const POINTS_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  varying float vAspect;
  varying float vDash;
  varying vec3 vColor;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dotShape = 1.0 - smoothstep(0.06, 0.5, length(uv));
    float bar = (1.0 - smoothstep(0.4, 0.5, abs(uv.x))) * (1.0 - smoothstep(0.16 * vAspect, 0.5 * vAspect, abs(uv.y)));
    float shape = mix(dotShape * dotShape, bar, vDash);
    gl_FragColor = vec4(vColor, shape * vAlpha);
  }
`;
const DUST_VERTEX = /* glsl */ `
  uniform vec3 uCam;
  uniform vec2 uBox;
  uniform vec4 uPulse;
  uniform float uTime, uPx, uD0, uAlpha;
  attribute vec3 aSeed;
  varying float vAlpha;
  varying float vTint;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.11 + aSeed.x * 30.0) * 26.0 + uTime * 3.4 * (aSeed.y - 0.3);
    p.y += cos(uTime * 0.09 + aSeed.y * 30.0) * 20.0 + uTime * 1.8 * (aSeed.x - 0.5);
    // The field repeats around the camera, so there is dust wherever the camera travels.
    vec2 rel = mod(p.xy - uCam.xy + uBox * 0.5, uBox) - uBox * 0.5;
    vec2 away = rel + uCam.xy - uPulse.xy;
    float off = (length(away) - uPulse.z) / 70.0;
    float ring = exp(-off * off) * uPulse.w;
    rel += normalize(away + 0.0001) * ring * 34.0;
    vec4 mv = vec4(rel, p.z - uCam.z, 1.0);
    gl_Position = projectionMatrix * mv;
    float persp = uD0 / max(1.0, -mv.z);
    gl_PointSize = clamp((1.5 + aSeed.z * 2.8) * persp * uPx * (1.0 + ring * 1.6), 1.0, 40.0);
    float twinkle = 0.6 + 0.4 * sin(uTime * 0.7 + aSeed.y * 40.0);
    // Dust that drifts right up to the lens fades instead of filling the frame.
    vAlpha = (uAlpha * (0.2 + 0.8 * aSeed.x) * twinkle + ring * 0.6) * (1.0 - smoothstep(-420.0, -90.0, mv.z));
    vTint = step(0.8, aSeed.z);
  }
`;
const DUST_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  varying float vTint;
  void main() {
    float d = 1.0 - smoothstep(0.0, 0.5, length(gl_PointCoord - 0.5));
    gl_FragColor = vec4(mix(vec3(1.0, 0.96, 0.9), vec3(0.973, 0.11, 0.898), vTint), d * d * vAlpha);
  }
`;
const BACK_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const BACK_FRAGMENT = /* glsl */ `
  uniform vec2 uRes;
  uniform vec3 uCam;
  uniform float uEngine, uDots, uGlow, uTime, uPx;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec2 p = (vUv * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0);
    vec3 col = mix(vec3(0.082, 0.078, 0.074), vec3(0.016, 0.016, 0.018), uEngine);
    // Two soft lights that drift: warm magenta high on the left, a cooler one low on the right.
    vec2 a = p - vec2(-0.95 + 0.14 * sin(uTime * 0.13), 0.62 + 0.08 * cos(uTime * 0.11));
    vec2 b = p - vec2(1.05 + 0.12 * cos(uTime * 0.09), -0.7 + 0.1 * sin(uTime * 0.12));
    col += vec3(0.2, 0.035, 0.17) * exp(-dot(a, a) * 1.1) * uGlow * (1.0 - uEngine * 0.5);
    col += vec3(0.05, 0.06, 0.1) * exp(-dot(b, b) * 0.9) * uGlow;
    // The source card's dotted black, continued as the floor of the engine room.
    vec2 world = uCam.xy + p * ${(H / 2).toFixed(1)} / uCam.z;
    vec2 cell = fract(world / 28.0) - 0.5;
    float soft = 0.7 / (28.0 * uCam.z * uPx);
    col += vec3(0.115) * (1.0 - smoothstep(0.05 - soft, 0.05 + soft, length(cell))) * uDots * smoothstep(0.2, 0.5, uCam.z);
    col *= 1.0 - 0.22 * dot(p, p) / (1.0 + dot(p, p));
    col += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 160.0;
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
    uniforms: { uRes: { value: new THREE.Vector2(W, H) }, uCam: { value: new THREE.Vector3(0, 0, 1) }, uEngine: { value: 0 }, uDots: { value: 0 }, uGlow: { value: 1 }, uTime: { value: 0 }, uPx: { value: 1 } },
  }));
  back.frustumCulled = false; back.renderOrder = -2;

  const rnd = seeded(7);
  const dustBox = new THREE.Vector2(3200, 1900);
  const dustPositions = new Float32Array(DUST * 3), dustSeeds = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dustPositions[i * 3] = (rnd() - 0.5) * dustBox.x; dustPositions[i * 3 + 1] = (rnd() - 0.5) * dustBox.y; dustPositions[i * 3 + 2] = -1100 + rnd() * 1300;
    dustSeeds[i * 3] = rnd(); dustSeeds[i * 3 + 1] = rnd(); dustSeeds[i * 3 + 2] = rnd();
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dustGeometry.setAttribute('aSeed', new THREE.BufferAttribute(dustSeeds, 3));
  const dustMaterial = new THREE.ShaderMaterial({
    vertexShader: DUST_VERTEX, fragmentShader: DUST_FRAGMENT, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uCam: { value: new THREE.Vector3() }, uBox: { value: dustBox }, uPulse: { value: new THREE.Vector4(0, 0, 0, 0) }, uTime: { value: 0 }, uPx: { value: 1 }, uD0: { value: D0 }, uAlpha: { value: 0.5 } },
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  dust.frustumCulled = false; dust.renderOrder = -1;

  const geometry = new THREE.BufferGeometry();
  const from = new THREE.BufferAttribute(new Float32Array(built.forms.titleLink), 3);
  const to = new THREE.BufferAttribute(new Float32Array(built.forms.titleLink), 3);
  const order = new THREE.BufferAttribute(new Float32Array(built.orders.seed), 1);
  const gainFrom = new THREE.BufferAttribute(new Float32Array(built.gains.titleLink), 1);
  const gainTo = new THREE.BufferAttribute(new Float32Array(built.gains.titleLink), 1);
  for (const attribute of [from, to, order, gainFrom, gainTo]) attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', from);
  geometry.setAttribute('aB', to);
  geometry.setAttribute('aGainA', gainFrom);
  geometry.setAttribute('aGainB', gainTo);
  geometry.setAttribute('aOrder', order);
  geometry.setAttribute('aW', new THREE.BufferAttribute(built.waypoints, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(built.seeds, 4));
  geometry.setAttribute('aLen', new THREE.BufferAttribute(built.lengths, 1));
  geometry.setAttribute('aRole', new THREE.BufferAttribute(built.roles, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: POINTS_VERTEX, fragmentShader: POINTS_FRAGMENT, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uP: { value: 1 }, uStagger: { value: 0 }, uTurb: { value: 0 }, uMode: { value: 0 }, uTime: { value: 0 }, uPx: { value: 1 }, uD0: { value: D0 },
      uDot: { value: 2.1 }, uThick: { value: 1.8 }, uDash: { value: 0 }, uAlpha: { value: 0 }, uBulk: { value: 1 }, uMagenta: { value: 0 }, uSweep: { value: -1e5 },
      uGate: { value: new THREE.Vector3(wx(PL.gate.x), wy(PL.gate.y), 0) },
    },
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(back, dust, points);

  let a: Formation = 'titleLink', b: Formation = 'titleLink', sequence: Order = 'seed';
  const u = material.uniforms, bu = back.material.uniforms, du = dustMaterial.uniforms;

  function resize(width: number, height: number) {
    if (width < 1 || height < 1) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    // Drawing-buffer px per canvas px at zoom 1: the canvas is always 720 tall on screen.
    const px = height / H * renderer.getPixelRatio();
    u.uPx.value = px; du.uPx.value = px; bu.uPx.value = px;
    renderer.getDrawingBufferSize(bu.uRes.value);
  }

  /** Paint second `time` of the reel through `cam`. `breath` keeps the idle poster alive without advancing the story. */
  function draw(time: number, cam: Camera, breath = 0) {
    const state = particlesAt(time);
    if (state.a !== a) { a = state.a; from.array.set(built.forms[a]); from.needsUpdate = true; gainFrom.array.set(built.gains[a]); gainFrom.needsUpdate = true; }
    if (state.b !== b) { b = state.b; to.array.set(built.forms[b]); to.needsUpdate = true; gainTo.array.set(built.gains[b]); gainTo.needsUpdate = true; }
    if (state.order !== sequence) { sequence = state.order; order.array.set(built.orders[sequence]); order.needsUpdate = true; }
    const clock = time + breath;
    u.uP.value = state.p; u.uStagger.value = state.stagger; u.uTurb.value = state.turb; u.uMode.value = state.mode;
    u.uDash.value = state.dash; u.uAlpha.value = state.alpha; u.uBulk.value = state.bulk; u.uMagenta.value = state.magenta;
    u.uSweep.value = state.sweep < -9000 ? -1e5 : wx(state.sweep); u.uTime.value = clock;
    points.visible = state.alpha > 0.002;

    const backdrop = backdropAt(time);
    const x = wx(cam.x), y = wy(cam.y);
    bu.uCam.value.set(x, y, cam.zoom); bu.uEngine.value = backdrop.engine; bu.uDots.value = backdrop.dots; bu.uGlow.value = backdrop.glow; bu.uTime.value = clock;
    du.uCam.value.set(x, y, D0 / cam.zoom); du.uTime.value = clock; du.uAlpha.value = 0.32 + 0.3 * backdrop.glow;
    let pulse: [number, number, number] | undefined;
    for (const candidate of PULSES) if (time >= candidate[0] && time < candidate[0] + 1.7) pulse = candidate;
    if (pulse) { const age = time - pulse[0]; du.uPulse.value.set(wx(pulse[1]), wy(pulse[2]), age * 760, 1 - age / 1.7); }
    else du.uPulse.value.w = 0;

    camera.position.set(x, y, D0 / cam.zoom);
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
  }

  /** Free everything. `release` also gives the WebGL context back at once (browsers allow only a few). */
  function dispose(release = true) {
    geometry.dispose(); dustGeometry.dispose(); back.geometry.dispose();
    material.dispose(); dustMaterial.dispose(); back.material.dispose();
    renderer.dispose();
    if (release) renderer.forceContextLoss();
  }

  return { draw, resize, dispose };
}

export type Stage3D = ReturnType<typeof createStage3D>;
