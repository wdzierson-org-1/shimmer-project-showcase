/** Original parametric sculptures for the six chapters. Built once, then projected into ASCII. */
export type Vec3 = [number, number, number];
export type Sculpture = Float32Array; // x, y, z, normal x/y/z, material, seed
const TAU = Math.PI * 2;
const hash = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
const normal = (x: number, y: number, z: number): Vec3 => { const d = Math.hypot(x, y, z) || 1; return [x / d, y / d, z / d]; };
class Geometry {
  values: number[] = [];
  point(p: Vec3, n: Vec3 = [0, 0, 1], material = 1) { this.values.push(...p, ...n, material, hash(this.values.length)); }
  add(model: Sculpture, scale = 1, x = 0, y = 0, z = 0) {
    for (let i = 0; i < model.length; i += 8) this.point(
      [model[i] * scale + x, model[i + 1] * scale + y, model[i + 2] * scale + z],
      [model[i + 3], model[i + 4], model[i + 5]], model[i + 6],
    );
  }
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
  cylinder(a: Vec3, b: Vec3, radius: number, material = 1, steps = 64) {
    const axis = normal(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const side = Math.abs(axis[2]) < .9 ? normal(-axis[1], axis[0], 0) : normal(0, -axis[2], axis[1]);
    const across: Vec3 = [axis[1] * side[2] - axis[2] * side[1], axis[2] * side[0] - axis[0] * side[2], axis[0] * side[1] - axis[1] * side[0]];
    this.surface(steps, 18, (u, v) => {
      const c = Math.cos(v * TAU) * radius, s = Math.sin(v * TAU) * radius;
      return [a[0] + (b[0] - a[0]) * u + side[0] * c + across[0] * s,
        a[1] + (b[1] - a[1]) * u + side[1] * c + across[1] * s,
        a[2] + (b[2] - a[2]) * u + side[2] * c + across[2] * s];
    }, () => material);
  }
  finish() { return new Float32Array(this.values); }
}

/** Three separate records flow into a single, readable conversation. Coordinates are y-down. */
export function ideaFlowPoint(line: number, u: number): Vec3 {
  const row = line % 3, lane = Math.floor(line / 3) - 3.5;
  const startY = (row - 1) * .65;
  return [-.8 + u * .69, startY * (1 - u) + (row - 1) * .16 * u + Math.sin(u * Math.PI) * lane * .012,
    .16 + Math.sin(u * Math.PI) * .12 + lane * .005];
}

export function ideaSculpture(): Sculpture {
  const g = new Geometry();
  for (let page = 0; page < 3; page++) {
    const x = -1.09 + (page === 1 ? -.07 : 0), y = (page - 1) * .65;
    const outline: Vec3[] = [[x - .22, y - .26, .14], [x + .1, y - .26, .14], [x + .22, y - .14, .14],
      [x + .22, y + .26, .14], [x - .22, y + .26, .14]];
    outline.forEach((p, i) => g.cylinder(p, outline[(i + 1) % outline.length], .013, 1, 42));
    g.line(u => [x + .1, y - .26 + u * .12, .16], 35);
    g.line(u => [x + .1 + u * .12, y - .14, .16], 35);
    for (let row = 0; row < 4; row++) g.line(u => [x - .14 + u * (row === 3 ? .19 : .28), y - .07 + row * .071, .17], 75, .8);
  }
  // A substantial speech outline, with a small tail and an answer arranged inside it.
  const outline = (u: number, z: number): Vec3 => {
    const t = ((u % 1) + 1) % 1 * 8, segment = Math.floor(t), v = t - segment;
    const x = .55, y = .57, r = .13;
    if (segment === 0) return [.57 - x + v * x * 2, -.7, z];
    if (segment === 2) return [1.25, -y + v * y * 2, z];
    if (segment === 4) return [.57 + x - v * x * 2, .7, z];
    if (segment === 6) return [-.11, y - v * y * 2, z];
    const corner = (segment - 1) / 2, a = (-1 + corner + v) * Math.PI / 2;
    return [.57 + (corner < 2 ? x : -x) + Math.cos(a) * r,
      (corner === 0 || corner === 3 ? -y : y) + Math.sin(a) * r, z];
  };
  g.surface(600, 12, (u, v) => {
    const p = outline(u, .13 + Math.sin(v * TAU) * .025);
    p[0] += Math.cos(u * TAU) * Math.cos(v * TAU) * .022;
    p[1] += Math.sin(u * TAU) * Math.cos(v * TAU) * .022;
    return p;
  });
  g.cylinder([.03, .61, .14], [-.04, .94, .14], .018, 1, 70);
  g.cylinder([-.04, .94, .14], [.4, .69, .14], .018, 1, 70);
  // One question, then a more complete answer. The circle recalls the companion's voice.
  g.line(u => [.15 + u * .61, -.39, .17], 180, .8);
  g.line(u => [.15 + u * .4, -.29, .17], 140, .65);
  g.surface(120, 10, (u, v) => {
    const a = u * TAU, r = .092 + Math.cos(v * TAU) * .011;
    return [.22 + Math.cos(a) * r, .03 + Math.sin(a) * r, .18 + Math.sin(v * TAU) * .011];
  });
  for (let row = 0; row < 5; row++) g.line(u => [.41 + u * (row === 4 ? .34 : .56), -.015 + row * .092, .18], 180, .9);
  return g.finish();
}

/** Life as a twisted ladder: a distinct silhouette between the planet and the connected field. */
export function lifeSculpture(): Sculpture {
  const g = new Geometry();
  const helix = (u: number, offset: number): Vec3 => {
    const a = u * TAU * 1.65 + offset, x = Math.cos(a) * .45, y = (u - .5) * 2.35;
    return [x * .91 - y * .41, x * .41 + y * .91, Math.sin(a) * .45];
  };
  for (const offset of [0, Math.PI]) g.surface(480, 16, (u, v) => {
    const p = helix(u, offset), a = v * TAU;
    return [p[0] + Math.cos(a) * .035, p[1] + Math.sin(a) * .025, p[2] + Math.sin(a) * .035];
  });
  for (let i = 0; i < 29; i++) g.cylinder(helix(i / 28, 0), helix(i / 28, Math.PI), .012, .75, 62);
  return g.finish();
}

export function intelligenceNodes(): Vec3[] {
  return Array.from({ length: 64 }, (_, i) => {
    const a = i / 64 * TAU, layer = i % 3;
    return [Math.cos(a) * 1.27, Math.sin(a * 2) * (.62 + layer * .1), Math.sin(a) * .46 + (layer - 1) * .12];
  });
}

/** An open, interwoven network: many domains meeting at a shared center. */
export function intelligenceSculpture(): Sculpture {
  const g = new Geometry(), nodes = intelligenceNodes();
  nodes.forEach((p, i) => {
    g.surface(22, 12, (u, v) => {
      const a = u * TAU, b = v * Math.PI, r = i % 8 === 0 ? .065 : .033;
      return [p[0] + Math.cos(a) * Math.sin(b) * r, p[1] + Math.cos(b) * r, p[2] + Math.sin(a) * Math.sin(b) * r];
    });
    for (const jump of [1, 7, 23]) {
      const q = nodes[(i + jump) % nodes.length];
      g.line(u => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u], 86, jump === 1 ? .85 : .3);
    }
  });
  return g.finish();
}

export function questionsSculpture(question: Sculpture): Sculpture {
  const g = new Geometry();
  g.add(question, .72, 0, -.05, .22);
  g.add(question, .35, -.98, -.34, -.15);
  g.add(question, .31, 1.02, .28, -.1);
  g.add(question, .27, .75, -.9, -.35);
  g.add(question, .26, -.65, .87, -.3);
  return g.finish();
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

/** A generic wrist-worn interface: curved band, rounded bezel, activity ring and hands. */
export function wearableSculpture() {
  const g = new Geometry();
  const rounded = (x: number) => Math.sign(x) * Math.pow(Math.abs(x), .4);
  g.surface(240, 18, (u, v) => {
    const a = u * TAU, bevel = v * TAU;
    return [rounded(Math.cos(a)) * (.44 + Math.cos(bevel) * .045), rounded(Math.sin(a)) * (.48 + Math.cos(bevel) * .045), .08 + Math.sin(bevel) * .075];
  });
  g.surface(112, 18, (u, v) => [rounded(Math.cos(u * TAU)) * .402 * v, rounded(Math.sin(u * TAU)) * .44 * v, .12], () => .12);
  for (const side of [-1, 1]) {
    g.surface(72, 24, (u, v) => [(v - .5) * (.54 - u * .1), side * (.49 + u * .55), -.02 - Math.sin(u * Math.PI / 2) * .17], () => .7);
    for (const edge of [-1, 1]) g.line(u => [edge * (.27 - u * .05), side * (.49 + u * .55), -.02 - Math.sin(u * Math.PI / 2) * .17], 160, 1.1);
    for (let rib = 0; rib < 9; rib++) {
      const u = (rib + .5) / 9;
      g.line(v => [(v - .5) * (.51 - u * .1), side * (.49 + u * .55), -.015 - Math.sin(u * Math.PI / 2) * .17], 36, .85);
    }
  }
  g.line(u => [Math.cos(u * TAU * .83 - 1.2) * .285, Math.sin(u * TAU * .83 - 1.2) * .285, .139], 340, 1.35);
  for (let i = 0; i < 12; i++) {
    const angle = i / 12 * TAU;
    g.line(u => [Math.cos(angle) * (.337 + u * .033), Math.sin(angle) * (.337 + u * .033), .137], 18, 1.05);
  }
  g.line(u => [-u * .12, -u * .13, .15], 85, 1.4);
  g.line(u => [u * .16, -u * .2, .15], 110, 1.4);
  g.cylinder([.455, .04, .035], [.57, .04, .035], .065, 1.1, 24);
  return g.finish();
}

/** An articulated arm with rotary joints and an open gripper; deliberately not a product likeness. */
export function roboticsSculpture() {
  const g = new Geometry();
  const shoulder: Vec3 = [-.46, .46, 0], elbow: Vec3 = [-.05, -.29, .02], wrist: Vec3 = [.6, -.66, .06];
  const joint = (p: Vec3, radius: number) => {
    g.surface(64, 28, (u, v) => {
      const a = u * TAU, b = v * Math.PI;
      return [p[0] + Math.cos(a) * Math.sin(b) * radius, p[1] + Math.sin(a) * Math.sin(b) * radius, p[2] + Math.cos(b) * radius * .75];
    }, () => .9);
    for (const r of [radius * .5, radius * .83]) g.line(u => [p[0] + Math.cos(u * TAU) * r, p[1] + Math.sin(u * TAU) * r, p[2] + radius * .78], 150, 1.25);
  };
  // A low, elliptical pedestal anchors the mechanism without a literal factory setting.
  g.surface(128, 16, (u, v) => [-.46 + Math.cos(u * TAU) * .4, .76 + (v - .5) * .14, Math.sin(u * TAU) * .25], () => .85);
  g.line(u => [-.46 + Math.cos(u * TAU) * .4, .69, Math.sin(u * TAU) * .25], 260, 1.1);
  g.cylinder([-.46, .71, 0], shoulder, .16, .8, 32);
  g.cylinder(shoulder, elbow, .12, .85);
  g.cylinder(elbow, wrist, .095, .95);
  // A second fine rail makes each link read as an engineered assembly.
  g.cylinder([-.57, .42, .09], [-.16, -.29, .11], .023, 1.2, 48);
  g.cylinder([-.01, -.18, .11], [.63, -.55, .15], .02, 1.2, 48);
  joint(shoulder, .23); joint(elbow, .2); joint(wrist, .15);
  const tip: Vec3 = [.84, -.55, .07];
  g.cylinder(wrist, tip, .075, 1.05, 30);
  // Two offset fingers open around a small pocket of air.
  for (const side of [-1, 1]) {
    const root: Vec3 = [tip[0] - side * .04, tip[1] + side * .09, tip[2]];
    const bend: Vec3 = [1.02 - side * .035, -.37 + side * .16, .07];
    const end: Vec3 = [1.13 - side * .035, -.26 + side * .1, .07];
    g.cylinder(root, bend, .035, 1.2, 32); g.cylinder(bend, end, .032, 1.3, 24);
  }
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
