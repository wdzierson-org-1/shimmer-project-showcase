import { craftSculpture, globeSculpture, heartSculpture, ideaFlowPoint, ideaSculpture, intelligenceNodes, intelligenceSculpture, knowledgeSculpture, lifeSculpture, phoneSculpture, questionSculpture, questionsSculpture, roboticsSculpture, wearableSculpture, type Sculpture, type Vec3 } from './journeyGeometry';

export const TAU = Math.PI * 2;
export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
export const hash = (x: number) => { const n = Math.sin(x * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
export type FieldShape = { positions: Float32Array; normals: Float32Array; weights: Float32Array };

function placed(source: Sculpture, scale = 1, x = 0, y = 0, z = 0): Sculpture {
  const out = source.slice();
  for (let i = 0; i < out.length; i += 8) {
    out[i] = out[i] * scale + x; out[i + 1] = -out[i + 1] * scale + y; out[i + 2] = out[i + 2] * scale + z;
    out[i + 4] *= -1;
  }
  return out;
}
function combine(...parts: Sculpture[]): Sculpture {
  const out = new Float32Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  parts.forEach(part => { out.set(part, offset); offset += part.length; });
  return out;
}

/** Sort a uniform surface sample into spatial bands: nearby letters travel together when forms change. */
export function sampleShape(model: Sculpture, count: number): FieldShape {
  const length = model.length / 8;
  const indices = Array.from({ length: count }, (_, i) => Math.min(length - 1, Math.floor((i + .5) * length / count)) * 8);
  indices.sort((a, b) => Math.floor(model[a + 1] * 14) - Math.floor(model[b + 1] * 14) || model[a] - model[b]);
  const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3), weights = new Float32Array(count);
  indices.forEach((offset, i) => {
    positions.set(model.subarray(offset, offset + 3), i * 3);
    normals.set(model.subarray(offset + 3, offset + 6), i * 3);
    weights[i] = model[offset + 6];
  });
  return { positions, normals, weights };
}

/** A connected world of mobile, wearable, and embodied interfaces. */
export function mobileWorldSculpture(): Sculpture {
  return combine(
    placed(globeSculpture(), .82, -.05, .1, -.45),
    placed(phoneSculpture(), .66, -1.01, -.1, .55),
    placed(wearableSculpture(), .54, .93, .62, .58),
    placed(roboticsSculpture(), .65, .55, -.72, .6),
  );
}

export function createJourneyShapes(count: number): FieldShape[] {
  const question = questionSculpture();
  if (!question) throw new Error('Could not create the letter field');
  return [
    placed(question, 1.04, 0, .03),
    placed(craftSculpture(), 1.18),
    mobileWorldSculpture(),
    placed(heartSculpture(), 1.25, 0, .08),
    placed(ideaSculpture()),
    combine(placed(globeSculpture(), 1.12), placed(knowledgeSculpture(), 1.31)),
    placed(lifeSculpture()),
    placed(intelligenceSculpture()),
    placed(questionsSculpture(question)),
  ].map(model => sampleShape(model, count));
}

// Fibonacci sphere and distance-linked topology, adapted from ThreeUI's Nexus Topology.
// See THREEUI_LICENSE.md. The chapter forms and their choreography are original.
const nodes: Vec3[] = Array.from({ length: 24 }, (_, i) => {
  const y = 1 - 2 * (i + .5) / 24, r = Math.sqrt(1 - y * y), angle = i * 2.399963;
  return [Math.cos(angle) * r * 1.2144, -y * 1.2144, Math.sin(angle) * r * 1.2144];
});
const links: [Vec3, Vec3][] = [];
nodes.forEach((p, i) => nodes.slice(i + 1).forEach(q => {
  if (Math.hypot(...p.map((v, k) => v - q[k])) < 1.0074) links.push([p, q]);
}));
export const CONTOURS = 48;
export const CONTOUR_STEPS = 96;
const intelligence = intelligenceNodes();

/** Fine connecting paths beneath each sculpture and the four glimpses of the finale. */
export function contourPoint(stage: number, line: number, u: number, time: number): Vec3 {
  const angle = u * TAU;
  switch (stage) {
    case 0: {
      const a = angle * .87 + line * .036 + .35, r = 1.28 + line * .009;
      return [Math.cos(a) * r, Math.sin(a) * r * .93, -.45 - line * .013];
    }
    case 1: {
      const a = u * TAU * 1.8 - .7, r = .1 + u * 1.38, v = line / CONTOURS * TAU;
      return [(r + Math.cos(v) * u * .19) * Math.cos(a), -(r + Math.cos(v) * u * .19) * Math.sin(a), Math.sin(v) * u * .32];
    }
    case 2: {
      if (line < 20) {
        const lat = (line / 19 - .5) * Math.PI, r = Math.cos(lat) * .85;
        return [-.05 + Math.cos(angle) * r, .1 + Math.sin(lat) * .85, -.45 + Math.sin(angle) * r];
      }
      if (line < 40) {
        const lon = (line - 20) / 20 * TAU;
        return [-.05 + Math.cos(angle) * Math.sin(lon) * .85, .1 + Math.sin(angle) * .85, -.45 + Math.cos(angle) * Math.cos(lon) * .85];
      }
      const a = u * TAU * .78 + (line - 40) * .13;
      return [Math.cos(a) * 1.5, Math.sin(a) * .97 - .04, -.25 + Math.sin(a) * .2];
    }
    case 3: {
      if (line < 12) {
        const x = (u - .5) * 3.5, envelope = Math.exp(-x * x * 2.8);
        return [x, -.13 + Math.sin(x * 18 - time * 2.2 + line * .14) * envelope * .15 + (line - 6) * .012, .65];
      }
      const r = .25 + (line - 12) / 36 * .97;
      return [Math.sin(angle) ** 3 * r * 1.25, (13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)) / 17 * r * 1.25 + .08, -.1 + Math.sqrt(Math.max(0, 1 - r * r)) * .4];
    }
    case 4: {
      if (line >= 24) return [0, 0, 0];
      const p = ideaFlowPoint(line, u);
      return [p[0], -p[1], p[2]];
    }
    case 5: {
      const [p, q] = links[line % links.length];
      return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
    }
    case 6: {
      const a = u * TAU * 1.65 + (line % 2) * Math.PI, r = .45 + Math.floor(line / 2) * .002;
      const x = Math.cos(a) * r, y = (u - .5) * 2.35;
      return [x * .91 - y * .41, -(x * .41 + y * .91), Math.sin(a) * r];
    }
    case 7: {
      const p = intelligence[line], q = intelligence[(line + 23) % intelligence.length];
      return [p[0] + (q[0] - p[0]) * u, -p[1] - (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
    }
    default: {
      if (line >= 12) return [0, 0, 0];
      const a = u * TAU * .83 + line * .09, r = 1.38 + line * .005;
      return [Math.cos(a) * r, Math.sin(a) * r * .85, -.6 + Math.sin(a) * .2];
    }
  }
}
