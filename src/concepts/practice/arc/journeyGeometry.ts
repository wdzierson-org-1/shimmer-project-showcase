/** Original parametric sculptures for the six chapters. Built once, then projected into ASCII. */
export type Vec3 = [number, number, number];
export type Sculpture = Float32Array; // x, y, z, normal x/y/z, material, seed
const TAU = Math.PI * 2;
const hash = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
const normal = (x: number, y: number, z: number): Vec3 => { const d = Math.hypot(x, y, z) || 1; return [x / d, y / d, z / d]; };
class Geometry {
  values: number[] = [];
  point(p: Vec3, n: Vec3 = [0, 0, 1], material = 1) { this.values.push(...p, ...n, material, hash(this.values.length)); }
  surface(nu: number, nv: number, fn: (u: number, v: number) => Vec3, material: (u: number, v: number) => number = () => 1) {
    for (let a = 0; a <= nu; a++) for (let b = 0; b <= nv; b++) {
      const u = a / nu, v = b / nv, p = fn(u, v), pu = fn(u + .0001, v), pv = fn(u, v + .0001);
      const ax = pu[0] - p[0], ay = pu[1] - p[1], az = pu[2] - p[2];
      const bx = pv[0] - p[0], by = pv[1] - p[1], bz = pv[2] - p[2];
      this.point(p, normal(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx), material(u, v));
    }
  }
  line(fn: (u: number) => Vec3, steps = 220, material = 1.15) {
    for (let i = 0; i <= steps; i++) this.point(fn(i / steps), [0, 0, 1], material);
  }
  finish() { return new Float32Array(this.values); }
}

export function questionSculpture(): Sculpture | null {
  const size = 320, canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.font = 'bold 318px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 160, 175);
  const pixels = ctx.getImageData(0, 0, size, size).data, distances = new Float32Array(size * size);
  for (let i = 0; i < distances.length; i++) distances[i] = pixels[i * 4 + 3] > 128 ? 999 : 0;
  // A chamfer distance field gives the type a softly machined bevel rather than a flat face.
  for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
    const i = y * size + x;
    distances[i] = Math.min(distances[i], distances[i - 1] + 1, distances[i - size] + 1, distances[i - size - 1] + 1.414, distances[i - size + 1] + 1.414);
  }
  for (let y = size - 2; y > 0; y--) for (let x = size - 2; x > 0; x--) {
    const i = y * size + x;
    distances[i] = Math.min(distances[i], distances[i + 1] + 1, distances[i + size] + 1, distances[i + size + 1] + 1.414, distances[i + size - 1] + 1.414);
  }
  const g = new Geometry();
  for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
    const i = y * size + x, d = distances[i]; if (!d) continue;
    const px = (x - 160) / 111, py = (y - 170) / 111, bevel = Math.min(1, d / 10);
    const dx = (distances[i + 1] - distances[i - 1]) / 2, dy = (distances[i + size] - distances[i - size]) / 2;
    g.point([px, py, .2 + .105 * Math.sin(bevel * Math.PI / 2)], normal(-dx * (1 - bevel) * 2, -dy * (1 - bevel) * 2, 1));
    if (d < 1.5) for (let z = -.24; z < .21; z += .012) g.point([px, py, z], normal(-dx, -dy, 0), .85);
    if (x % 2 === 0 && y % 2 === 0) g.point([px, py, -.24], [0, 0, -1], .7);
  }
  canvas.width = 0; return g.finish();
}

export function craftSculpture() {
  const g = new Geometry();
  // A growing spiral: one continuous, increasingly confident piece of craft.
  g.surface(560, 88, (u, v) => {
    const theta = u * TAU * 1.8 - .7, r = .075 + u * 1.02, tube = .025 + u * .17, a = v * TAU;
    return [(r + Math.cos(a) * tube) * Math.cos(theta), (r + Math.cos(a) * tube) * Math.sin(theta), Math.sin(a) * tube * 1.5 + (.5 - u) * .22];
  }, u => .72 + .28 * Math.pow(.5 + .5 * Math.cos(u * TAU * 80), 8));
  return g.finish();
}
export function globeSculpture() {
  const g = new Geometry();
  g.surface(192, 112, (u, v) => {
    const lon = u * TAU, lat = (v - .5) * Math.PI;
    return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
  }, (u, v) => {
    const lat = Math.abs(Math.sin(v * Math.PI * 12)), lon = Math.abs(Math.sin(u * TAU * 12));
    return lat < .13 || lon < .065 ? 1 : .17;
  });
  return g.finish();
}
export function phoneSculpture() {
  const g = new Geometry();
  const boundary = (t: number, inset = 0): Vec3 => {
    const w = .43 - inset, h = .81 - inset, r = .09;
    const part = Math.min(7, Math.floor(t * 8)), u = (t * 8) % 1;
    switch (part) {
      case 0: return [-w + r + u * (2 * w - 2 * r), -h, .06];
      case 1: { const a = -Math.PI / 2 + u * Math.PI / 2; return [w - r + Math.cos(a) * r, -h + r + Math.sin(a) * r, .06]; }
      case 2: return [w, -h + r + u * (2 * h - 2 * r), .06];
      case 3: { const a = u * Math.PI / 2; return [w - r + Math.cos(a) * r, h - r + Math.sin(a) * r, .06]; }
      case 4: return [w - r - u * (2 * w - 2 * r), h, .06];
      case 5: { const a = Math.PI / 2 + u * Math.PI / 2; return [-w + r + Math.cos(a) * r, h - r + Math.sin(a) * r, .06]; }
      case 6: return [-w, h - r - u * (2 * h - 2 * r), .06];
      default: { const a = Math.PI + u * Math.PI / 2; return [-w + r + Math.cos(a) * r, -h + r + Math.sin(a) * r, .06]; }
    }
  };
  for (const inset of [0, .025, .055]) g.line(u => boundary(u % 1, inset), 1400, 1.3);
  g.surface(1000, 12, (u, v) => { const p = boundary(u % 1); return [p[0], p[1], .06 - v * .13]; }, () => .7);
  g.surface(80, 160, (u, v) => [(u - .5) * .72, (v - .5) * 1.41, .04], () => .065);
  for (let row = 0; row < 10; row++) {
    const y = -.39 + row * .093, length = row % 3 === 0 ? .31 : .22;
    g.line(u => [-.29 + u * length * 2, y, .065], 90, row === 0 ? 1.2 : .4);
  }
  g.line(u => [-.12 + u * .24, -.65, .069], 100, 1.35);
  g.line(u => [Math.cos(u * TAU) * .038, .65 + Math.sin(u * TAU) * .038, .069], 90, 1.1);
  return g.finish();
}
export function heartSculpture() {
  const g = new Geometry();
  // A rounded volume with a recognizable silhouette and a light-catching centre seam.
  for (const side of [1, -1]) g.surface(320, 95, (u, v) => {
    const a = u * TAU, r = .025 + v * .975;
    return [Math.sin(a) ** 3 * r, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17 * r,
      side * .4 * Math.sqrt(Math.max(0, 1 - r * r)) * (.86 + .14 * Math.abs(Math.sin(a)))];
  });
  return g.finish();
}
export function knowledgeSculpture() {
  const g = new Geometry(), nodes: Vec3[] = [];
  // Source material becomes connected knowledge. The lattice stays open enough to read each relationship.
  for (let i = 0; i < 24; i++) {
    const y = 1 - (i + .5) / 12, angle = i * 2.399963, r = Math.sqrt(1 - y * y);
    nodes.push([Math.cos(angle) * r * .88, y * .88, Math.sin(angle) * r * .88]);
  }
  nodes.forEach((p, i) => {
    g.surface(28, 16, (u, v) => { const a = u * TAU, b = v * Math.PI, r = i % 4 === 0 ? .06 : .033;
      return [p[0] + r * Math.cos(a) * Math.sin(b), p[1] + r * Math.cos(b), p[2] + r * Math.sin(a) * Math.sin(b)]; }, () => 1.3);
    nodes.forEach((q, j) => {
      if (j <= i || Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > .73) return;
      g.line(u => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u], 110, .62);
    });
  });
  for (let ring = 0; ring < 9; ring++) {
    const y = (ring / 8 - .5) * .64, r = Math.sqrt(.36 ** 2 - y ** 2);
    g.line(u => [r * Math.cos(u * TAU), y, r * Math.sin(u * TAU)], 210, .5);
  }
  return g.finish();
}
export function sourceSculpture() {
  const g = new Geometry();
  for (let page = 0; page < 3; page++) {
    const x = -.17 + page * .09, y = -.38 + page * .19, z = -.07 * page;
    const corners: Vec3[] = [[x, y, z], [x + .4, y, z], [x + .4, y + .56, z], [x, y + .56, z]];
    corners.forEach((p, i) => { const q = corners[(i + 1) % 4]; g.line(u => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, z], 100, .8); });
    for (let row = 0; row < 5; row++) g.line(u => [x + .06 + u * (row === 4 ? .17 : .28), y + .12 + row * .07, z + .005], 70, .45);
  }
  return g.finish();
}
