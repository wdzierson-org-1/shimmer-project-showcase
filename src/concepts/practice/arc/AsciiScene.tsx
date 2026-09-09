import { useEffect, useRef } from 'react';
import { CHAPTER_SECONDS } from './story';
import { craftSculpture, globeSculpture, heartSculpture, ideaFlowPoint, ideaSculpture, intelligenceSculpture, knowledgeSculpture, lifeSculpture, phoneSculpture, questionSculpture, questionsSculpture, roboticsSculpture, wearableSculpture, type Sculpture, type Vec3 } from './journeyGeometry';
import { journeyFrame, PARTICLE_RGB } from './journeySequence';

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
    const wearable = wearableSculpture(), robotics = roboticsSculpture();
    const heart = heartSculpture(), knowledge = knowledgeSculpture(), idea = ideaSculpture();
    const life = lifeSculpture(), intelligence = intelligenceSculpture(), questions = questionsSculpture(question);
    host.appendChild(canvas);
    const atlas = document.createElement('canvas'), ac = atlas.getContext('2d');
    if (!ac) { canvas.remove(); onError(); return; }
    const aw = 24, ah = 38, levels = 16;
    const inks = fireflies ? INKS.map(() => PARTICLE_RGB) : INKS;
    atlas.width = GLYPHS.length * aw; atlas.height = INKS.length * levels * ah;
    ac.font = '29px ui-monospace, monospace'; ac.textAlign = 'center'; ac.textBaseline = 'middle';
    inks.forEach((ink, color) => { for (let l = 0; l < levels; l++) {
      ac.fillStyle = `rgba(${ink.join(',')},${.13 + l / 15 * .87})`;
      GLYPHS.forEach((glyph, i) => {
        const x = (i + .5) * aw, y = (color * levels + l + .5) * ah;
        ac.fillStyle = `rgba(${ink.join(',')},${.13 + l / 15 * .87})`;
        if (!fireflies || i !== 7) { ac.fillText(glyph, x, y); return; }
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
    let dispersion = 0;

    function sculpture(model: Sculpture, pose: Pose = {}) {
      const { x = 0, y = 0, z = 0, scale = 1, yaw = 0, pitch = 0, roll = 0, light: brightness = 1 } = pose;
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
      // One rotation matrix per actor; no object allocations or sorting in the vertex loop.
      const m0 = cr * cy - sr * sp * sy, m1 = -sr * cp, m2 = cr * sy + sr * sp * cy;
      const m3 = sr * cy + cr * sp * sy, m4 = cr * cp, m5 = sr * sy - cr * sp * cy;
      const m6 = -cp * sy, m7 = sp, m8 = cp * cy;
      for (let i = 0; i < model.length; i += 8) {
        const vx = model[i], vy = model[i + 1], vz = model[i + 2];
        let px = (m0 * vx + m1 * vy + m2 * vz) * scale + x;
        let py = (m3 * vx + m4 * vy + m5 * vz) * scale + y;
        let pz = (m6 * vx + m7 * vy + m8 * vz) * scale + z;
        let visibility = 1;
        if (dispersion > 0) {
          const seed = model[i + 7], flight = ease((dispersion - seed * .22) / (.75 + seed * .03));
          const drift = flight * flight * 1.7;
          px += Math.sin(seed * 41 + flight * 1.2) * drift;
          py -= (.3 + Math.cos(seed * 29)) * drift;
          pz += Math.sin(seed * 67) * drift;
          visibility = 1 - ease((flight - .05) / .95);
        }
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
        light[cell] = model[i + 6] * brightness * visibility;
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
      ink = Math.min(ink, 5);
      ctx!.save(); ctx!.globalAlpha *= 1 - ease(dispersion / .4);
      ctx!.strokeStyle = `rgba(${inks[ink].join(',')},${alpha})`; ctx!.lineWidth = .65;
      ctx!.beginPath();
      for (let i = 0; i <= 120; i++) { const [x, y] = project(fn(i / 120)); if (i === 0) ctx!.moveTo(x, y); else ctx!.lineTo(x, y); }
      ctx!.stroke();
      if (phase !== undefined) {
        for (let i = 0; i < 4; i++) { const [x, y] = project(fn((phase + i * .012) % 1)); character(x, y, .7 - i * .14, ink, .55, 1.15); }
      }
      ctx!.restore();
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
      if ((stage === 2 || stage === 5) && !front) {
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
        for (let j = 0; j < 3; j++) path(u => ideaFlowPoint(j + 9, u), stage, .3, (t * .23 + j / 3) % 1);
      }
      if (stage === 8 && !front) {
        for (let j = 0; j < 3; j++) path(u => { const a = u * TAU * .78 + .2 + j * .08;
          return [Math.cos(a) * (1.38 + j * .025), Math.sin(a) * (1.16 + j * .025), -.6]; }, stage, .19 - j * .035);
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
          sculpture(globe, { x: -.05, y: -.1, z: -.45, scale: .72, yaw: t * .13, roll: -.23, light: .8 });
          sculpture(phone, { x: -1.01, y: .1, z: .55, scale: .66, yaw: -.17, pitch: -.08 });
          sculpture(wearable, { x: .93, y: -.62, z: .58, scale: .54, yaw: -.17 });
          sculpture(robotics, { x: .55, y: .72, z: .6, scale: .65, yaw: -.12 }); break;
        case 3: sculpture(heart, { yaw: -.22 + Math.sin(t * .14) * .16, pitch: -.1, roll: -.06, scale: 1.02 + Math.sin(t * TAU / 1.65) ** 8 * .022 }); break;
        case 4: sculpture(idea, { yaw: -.12, pitch: -.05 }); break;
        case 5:
          sculpture(globe, { scale: 1.08, yaw: t * .08 });
          sculpture(knowledge, { scale: 1.25, yaw: t * .08 }); break;
        case 6: sculpture(life, { yaw: -.12, pitch: -.06 }); break;
        case 7: sculpture(intelligence, { yaw: -.12, pitch: -.06 }); break;
        default: sculpture(questions, { yaw: -.12, pitch: -.06 });
      }
      for (let i = 0; i < light.length; i++) {
        if (light[i] < .04) continue;
        const x = (i % columns + .5) * cw, y = (Math.floor(i / columns) + .5) * ch;
        const nx = normalsX[i], ny = normalsY[i], nz = normalsZ[i];
        const diffuse = Math.max(0, -nx * .46 - ny * .56 + nz * .69);
        const highlight = Math.max(0, -nx * .24 - ny * .3 + nz * .92);
        const h2 = highlight * highlight, h4 = h2 * h2, h8 = h4 * h4, rim = 1 - nz;
        const value = (.17 + diffuse * .61 + h8 * h8 * h2 * .24 + rim * rim * rim * .22) * light[i];
        const pulse = fireflies ? .9 + .1 * Math.sin(t * .6 + seeds[i] * 97) : 1;
        character(x, y, value * pulse, Math.min(stage, 5), seeds[i]);
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
      const frame = journeyFrame(seconds, still), mix = ease(frame.mix);
      dispersion = frame.dissolve;
      const t = still ? frame.chapter * CHAPTER_SECONDS + 4 : seconds;
      ctx!.clearRect(0, 0, width, height); atmosphere(t);
      if (frame.from !== frame.to && mix < 1) chapter(frame.from, t, 1 - mix);
      chapter(frame.to, t, frame.chapter === 0 ? 1 : mix);
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
