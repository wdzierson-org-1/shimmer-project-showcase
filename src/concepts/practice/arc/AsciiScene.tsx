import { useEffect, useRef } from 'react';
import { CHAPTER_SECONDS, chapterAt } from './story';
import { craftSculpture, globeSculpture, heartSculpture, knowledgeSculpture, phoneSculpture, questionSculpture, sourceSculpture, type Sculpture, type Vec3 } from './journeyGeometry';

export type SceneHandle = { render: (seconds: number, still?: boolean) => void };
type Props = { onReady: (handle: SceneHandle) => void; onError: () => void; fireflies?: boolean };
const TAU = Math.PI * 2;
const GLYPHS = ['.', ':', '-', '~', '+', '=', 'x', '*', '#', '%', '@'];
const INKS = [[207, 231, 203], [168, 214, 185], [188, 227, 218], [247, 191, 150], [222, 223, 177], [217, 232, 204]];
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const x = clamp(n); return x * x * (3 - 2 * x); };
const noise = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
type Pose = { x?: number; y?: number; z?: number; scale?: number; yaw?: number; pitch?: number; roll?: number; light?: number };

/** A lit, depth-buffered ASCII renderer. Geometry is cached; animation follows only the player's clock. */
export default function AsciiScene({ onReady, onError, fireflies = false }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) { onError(); return; }
    const question = questionSculpture();
    if (!question) { onError(); return; }
    const craft = craftSculpture(), globe = globeSculpture(), phone = phoneSculpture();
    const heart = heartSculpture(), knowledge = knowledgeSculpture(), sources = sourceSculpture();
    host.appendChild(canvas);
    const atlas = document.createElement('canvas'), ac = atlas.getContext('2d');
    if (!ac) { canvas.remove(); onError(); return; }
    const aw = 24, ah = 38, levels = 16;
    const inks = fireflies ? [[243,221,181], [235,216,188], [225,220,240], [242,207,176], [238,224,184], [244,223,191]] : INKS;
    atlas.width = GLYPHS.length * aw; atlas.height = INKS.length * levels * ah;
    ac.font = '29px ui-monospace, monospace'; ac.textAlign = 'center'; ac.textBaseline = 'middle';
    inks.forEach((ink, color) => { for (let l = 0; l < levels; l++) {
      ac.fillStyle = `rgba(${ink.join(',')},${.13 + l / 15 * .87})`;
      GLYPHS.forEach((glyph, i) => {
        const x = (i + .5) * aw, y = (color * levels + l + .5) * ah;
        if (!fireflies) { ac.fillText(glyph, x, y); return; }
        const glow = ac.createRadialGradient(x, y, 0, x, y, aw * .49);
        glow.addColorStop(0, `rgba(${ink.join(',')},${.2 + l / 15 * .8})`);
        glow.addColorStop(.15, `rgba(${ink.join(',')},${.1 + l / 15 * .6})`);
        glow.addColorStop(.4, `rgba(${ink.join(',')},.12)`); glow.addColorStop(1, `rgba(${ink.join(',')},0)`);
        ac.fillStyle = glow; ac.fillRect(i * aw, y - ah / 2, aw, ah);
      });
    } });
    let width = 1, height = 1, columns = 1, rows = 1, cw = 1, ch = 1, unit = 1;
    let depth = new Float32Array(0), light = new Float32Array(0), seeds = new Float32Array(0);
    let normalsX = new Float32Array(0), normalsY = new Float32Array(0), normalsZ = new Float32Array(0);
    const densityCurve = Float32Array.from({ length: 256 }, (_, i) => Math.pow(i / 255, .58));
    let last = 4, lastDrawn = -Infinity, frozen = true, disposed = false;

    function sculpture(model: Sculpture, pose: Pose = {}) {
      const { x = 0, y = 0, z = 0, scale = 1, yaw = 0, pitch = 0, roll = 0, light: brightness = 1 } = pose;
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
      // One rotation matrix per actor; no object allocations or sorting in the vertex loop.
      const m0 = cr * cy - sr * sp * sy, m1 = -sr * cp, m2 = cr * sy + sr * sp * cy;
      const m3 = sr * cy + cr * sp * sy, m4 = cr * cp, m5 = sr * sy - cr * sp * cy;
      const m6 = -cp * sy, m7 = sp, m8 = cp * cy;
      for (let i = 0; i < model.length; i += 8) {
        const vx = model[i], vy = model[i + 1], vz = model[i + 2];
        const px = (m0 * vx + m1 * vy + m2 * vz) * scale + x;
        const py = (m3 * vx + m4 * vy + m5 * vz) * scale + y;
        const pz = (m6 * vx + m7 * vy + m8 * vz) * scale + z;
        const perspective = 4.8 / (4.8 - pz);
        const col = Math.floor((width * .52 + px * unit * perspective) / cw);
        const row = Math.floor((height * .49 + py * unit * perspective) / ch);
        if (col < 0 || col >= columns || row < 0 || row >= rows) continue;
        const cell = row * columns + col;
        if (pz < depth[cell]) continue;
        depth[cell] = pz;
        const nx0 = model[i + 3], ny0 = model[i + 4], nz0 = model[i + 5];
        let nx = m0 * nx0 + m1 * ny0 + m2 * nz0;
        let ny = m3 * nx0 + m4 * ny0 + m5 * nz0;
        let nz = m6 * nx0 + m7 * ny0 + m8 * nz0;
        // Store the winning surface normal; shade each occupied character once, after all actors.
        if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
        normalsX[cell] = nx; normalsY[cell] = ny; normalsZ[cell] = nz;
        light[cell] = model[i + 6] * brightness;
        seeds[cell] = model[i + 7];
      }
    }
    function character(px: number, py: number, value: number, ink: number, seed: number, size = 1) {
      const density = densityCurve[Math.round(clamp(value) * 255)], glyph = Math.min(GLYPHS.length - 1, Math.floor(density * 9 + seed * 1.8));
      const level = Math.round(density * 15);
      ctx!.drawImage(atlas, glyph * aw, (ink * levels + level) * ah, aw, ah,
        px - cw * size / 2, py - ch * size / 2, cw * size, ch * size);
    }
    function atmosphere(t: number) {
      if (fireflies) return;
      ctx!.fillStyle = '#c4debf18';
      const step = width < 500 ? 26 : 38;
      for (let x = step; x < width - step; x += step) for (let y = step * 2; y < height - step; y += step) ctx!.fillRect(x, y, .7, .7);
      for (let i = 0; i < 48; i++) {
        const x = width * (.12 + noise(i + 4) * .76) + Math.sin(t * .08 + i) * 5;
        const y = height * (.16 + noise(i + 71) * .67) + Math.cos(t * .06 + i) * 5;
        character(x, y, .1 + noise(i) * .12, 0, noise(i + 33), .8);
      }
      ctx!.strokeStyle = '#d0e0c42a'; ctx!.lineWidth = .6;
      for (const [x, y, sx, sy] of [[.12, .14, 1, 1], [.9, .14, -1, 1], [.12, .87, 1, -1], [.9, .87, -1, -1]]) {
        ctx!.beginPath(); ctx!.moveTo(x * width, y * height + sy * 9); ctx!.lineTo(x * width, y * height); ctx!.lineTo(x * width + sx * 9, y * height); ctx!.stroke();
      }
    }
    function project(p: Vec3): [number, number] {
      const f = 4.8 / (4.8 - p[2]); return [width * .52 + p[0] * unit * f, height * .49 + p[1] * unit * f];
    }
    function path(fn: (u: number) => Vec3, ink: number, alpha: number, phase?: number) {
      if (fireflies) {
        for (let i = 0; i <= 100; i += 3) {
          const [x, y] = project(fn(i / 100)); character(x, y, alpha * 1.6, ink, noise(i + ink), .9);
        }
        return;
      }
      ctx!.strokeStyle = `rgba(${inks[ink].join(',')},${alpha})`; ctx!.lineWidth = .65;
      ctx!.beginPath();
      for (let i = 0; i <= 120; i++) { const [x, y] = project(fn(i / 120)); if (i === 0) ctx!.moveTo(x, y); else ctx!.lineTo(x, y); }
      ctx!.stroke();
      if (phase !== undefined) {
        for (let i = 0; i < 4; i++) { const [x, y] = project(fn((phase + i * .012) % 1)); character(x, y, .7 - i * .14, ink, .55, 1.15); }
      }
    }
    function accents(stage: number, t: number, front: boolean) {
      if (stage === 0 && !front) {
        for (let ring = 0; ring < 2; ring++) path(u => { const a = u * TAU * .77 + t * .035 + ring * 2;
          return [Math.cos(a) * (1.12 + ring * .08), Math.sin(a) * (1.12 + ring * .08), -.4]; }, stage, .15);
      }
      if (stage === 1 && !front) {
        for (let ring = 0; ring < 3; ring++) path(u => { const a = u * TAU; return [Math.cos(a) * (1.22 + ring * .09), Math.sin(a) * (1.22 + ring * .09), -.3]; }, stage, .11);
        for (let j = 0; j < 4; j++) path(u => { const a = j / 4 * TAU + .15; return [Math.cos(a) * u * 1.52, Math.sin(a) * u * 1.52, -.35]; }, stage, .13);
      }
      if (stage === 2 && !front) {
        for (let j = 0; j < 3; j++) path(u => {
          const a = u * TAU + j * .7, x = Math.cos(a) * 1.25, y = Math.sin(a) * .37;
          const angle = -.38 + j * .56; return [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle), -.3 + Math.sin(a) * .3];
        }, stage, .23, (t * .055 + j / 3) % 1);
      }
      if (stage === 3 && front) {
        // Multiple harmonics give the pulse the shape of a human voice, crossing the heart's volume.
        for (let j = 0; j < 3; j++) path(u => {
          const x = (u - .5) * 2.8, envelope = Math.exp(-x * x * 2.4);
          const y = .24 + (Math.sin(x * 19 - t * 2.8 + j * .32) * .095 + Math.sin(x * 31 + t * 1.4) * .035) * envelope;
          return [x, y + (j - 1) * .045, .53];
        }, stage, j === 1 ? .62 : .24);
      }
      if (stage === 4 && !front) {
        for (let j = 0; j < 3; j++) path(u => [-1.07 + u * 1.28, -.25 + j * .25 + Math.sin(u * Math.PI) * (j - 1) * .28, .12 - u * .4], stage, .3, (t * .13 + j / 3) % 1);
        path(u => { const a = u * TAU; return [.28 + Math.cos(a) * 1.03, Math.sin(a) * 1.03, -.4]; }, stage, .12);
      }
      if (stage === 5 && !front) {
        // An unfinished aperture and a horizon: the question stays open.
        for (let j = 0; j < 3; j++) path(u => { const a = u * TAU * .78 + .2 + j * .08;
          return [Math.cos(a) * (1.02 + j * .065), -.27 + Math.sin(a) * (1.02 + j * .065), -.5]; }, stage, .19 - j * .035);
        for (let j = -9; j <= 9; j++) path(u => [j * .18 * (.25 + u * 1.25), .5 + u * .55, -2.5 + u * 3], stage, .15);
        for (let j = 0; j < 11; j++) { const progress = (j / 11 + t * .013) % 1;
          path(u => [(u - .5) * 3.6, .5 + progress * .55, -2.5 + progress * 3], stage, .06 + progress * .13);
        }
      }
    }
    function chapter(stage: number, t: number, opacity: number) {
      if (opacity < .01) return;
      ctx!.save(); ctx!.globalAlpha = opacity;
      accents(stage, t, false);
      depth.fill(-Infinity); light.fill(0);
      switch (stage) {
        case 0: sculpture(question!, { yaw: -.48 + Math.sin(t * .2) * .17, pitch: -.08, roll: -.07, y: .03, scale: .86 }); break;
        case 1: sculpture(craft, { yaw: -.17 + Math.sin(t * .12) * .22, pitch: -.23, roll: t * .025, scale: .94 }); break;
        case 2:
          sculpture(globe, { x: .3, y: -.14, z: -.42, scale: .94, yaw: t * .13, roll: -.23, light: .8 });
          sculpture(phone, { x: -.5, y: .16, z: .65, scale: .8, yaw: -.3 + Math.sin(t * .12) * .08, pitch: -.12, roll: -.12 }); break;
        case 3: sculpture(heart, { yaw: -.22 + Math.sin(t * .14) * .16, pitch: -.1, roll: -.06, scale: 1.02 + Math.sin(t * TAU / 1.65) ** 8 * .022 }); break;
        case 4:
          sculpture(knowledge, { x: .29, yaw: t * .13, pitch: -.14, scale: 1.08 });
          sculpture(sources, { x: -1.1, y: .08, z: .35, yaw: -.23, roll: -.1 }); break;
        default: sculpture(question!, { yaw: -.25 + Math.sin(t * .13) * .2, pitch: -.06, roll: .035, scale: .68, y: -.3 });
      }
      for (let i = 0; i < light.length; i++) {
        if (light[i] < .04) continue;
        const x = (i % columns + .5) * cw, y = (Math.floor(i / columns) + .5) * ch;
        const nx = normalsX[i], ny = normalsY[i], nz = normalsZ[i];
        const diffuse = Math.max(0, -nx * .46 - ny * .56 + nz * .69);
        const highlight = Math.max(0, -nx * .24 - ny * .3 + nz * .92);
        const h2 = highlight * highlight, h4 = h2 * h2, h8 = h4 * h4, rim = 1 - nz;
        const value = (.17 + diffuse * .61 + h8 * h8 * h2 * .24 + rim * rim * rim * .22) * light[i];
        if (fireflies && seeds[i] < .3) continue;
        const pulse = fireflies ? .45 + .55 * Math.pow(.5 + .5 * Math.sin(t * .7 + seeds[i] * 97), 2) : 1;
        character(x, y, value * pulse, stage, seeds[i], fireflies ? 1.5 : 1);
      }
      accents(stage, t, true); ctx!.restore();
    }
    function render(seconds: number, still = false) {
      if (disposed) return;
      last = seconds; frozen = still;
      // Slow sculptures need only 30fps; keep the player, type and controls on their existing clock.
      // A backward seek, static frame or resize always paints immediately.
      if (!still && seconds >= lastDrawn && seconds - lastDrawn < 1 / 30 - .001) return;
      lastDrawn = seconds;
      const stage = chapterAt(seconds), local = seconds - stage * CHAPTER_SECONDS;
      const previous = Math.max(0, stage - 1), mix = still ? 1 : ease(local / 1.9);
      const t = still ? stage * CHAPTER_SECONDS + 4 : seconds;
      ctx!.clearRect(0, 0, width, height); atmosphere(t);
      if (previous !== stage && mix < 1) chapter(previous, t, 1 - mix);
      chapter(stage, t, stage === 0 ? 1 : mix);
    }
    const resize = () => {
      const rect = host.getBoundingClientRect(); width = rect.width; height = rect.height;
      if (!width || !height) return;
      const dpr = Math.min(devicePixelRatio, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.max(64, Math.min(220, Math.round(width / (width < 500 ? 2.65 : 3.65))));
      cw = width / columns; rows = Math.round(height / (cw * 1.48)); ch = height / rows;
      unit = Math.min(width, height) * .34;
      depth = new Float32Array(columns * rows); light = new Float32Array(columns * rows); seeds = new Float32Array(columns * rows);
      normalsX = new Float32Array(columns * rows); normalsY = new Float32Array(columns * rows); normalsZ = new Float32Array(columns * rows);
      lastDrawn = -Infinity; render(last, frozen);
    };
    const observer = new ResizeObserver(resize); observer.observe(host); resize(); onReady({ render });
    return () => { disposed = true; observer.disconnect(); canvas.remove(); atlas.width = 0; };
  }, [onReady, onError, fireflies]);
  return <div className="arc-canvas" ref={mount} aria-hidden="true" />;
}
