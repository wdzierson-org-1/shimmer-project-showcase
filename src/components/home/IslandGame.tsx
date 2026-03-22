import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { VILLAS, CAVE_BOOK, type VillaBook, type CaveBook } from '@/lib/villaBooks';
import { NpcChat, VolumeControl, useIslandMusic, NPC_POSITIONS } from './IslandExtras';

// ─── Island constants ────────────────────────────────────────────────────────
const GRID = 21;
const HALF = GRID / 2;

// ─── Hut placement — 5 career acts, west→east chronological ─────────────────
//  Act I  Foundation      NW corner  (amber)
//  Act II Institution     NE corner  (teal)
//  Act III AI Turn        SW corner  (violet)
//  Act IV Builder Era     SE corner  (green)
//  Act V  What's Next     S center   (gold)
//  Cove   Easter egg      E shore    (no label)
const HUT_POSITIONS: Array<{ slug: string; gx: number; gz: number }> = [
  { slug: 'foundation',   gx: 4,  gz: 4  },
  { slug: 'institution',  gx: 16, gz: 4  },
  { slug: 'ai-turn',      gx: 3,  gz: 14 },
  { slug: 'builder-era',  gx: 17, gz: 13 },
  { slug: "what's-next",  gx: 10, gz: 17 },
];

// Cove easter egg — eastern beach edge, mid-island
const CAVE_POSITION = { gx: 18, gz: 10 };

// ─── Island shape helpers ────────────────────────────────────────────────────
function inIsland(gx: number, gz: number): boolean {
  const dx = (gx - HALF) / (GRID * 0.42);
  const dz = (gz - HALF) / (GRID * 0.42);
  return dx * dx + dz * dz < 1.0;
}

function isSand(gx: number, gz: number): boolean {
  const dx = (gx - HALF) / (GRID * 0.42);
  const dz = (gz - HALF) / (GRID * 0.42);
  const d = dx * dx + dz * dz;
  return d >= 0.80 && d < 1.0;
}

function isPath(gx: number, gz: number): boolean {
  if (!inIsland(gx, gz) || isSand(gx, gz)) return false;
  const cx = Math.floor(HALF);
  // Cross through center
  if (gx === cx || gz === cx) return true;
  // Spokes to each hut
  for (const h of HUT_POSITIONS) {
    if (gx === h.gx && Math.min(h.gz, cx) <= gz && gz <= Math.max(h.gz, cx)) return true;
    if (gz === h.gz && Math.min(h.gx, cx) <= gx && gx <= Math.max(h.gx, cx)) return true;
  }
  return false;
}

function isNearHut(gx: number, gz: number): boolean {
  if (HUT_POSITIONS.some(h => Math.abs(h.gx - gx) <= 4 && Math.abs(h.gz - gz) <= 4)) return true;
  return Math.abs(CAVE_POSITION.gx - gx) <= 4 && Math.abs(CAVE_POSITION.gz - gz) <= 4;
}

// ─── Animated water shader ───────────────────────────────────────────────────
const waterVertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave = sin(pos.x * 1.8 + uTime * 1.2) * 0.04
               + sin(pos.z * 2.2 + uTime * 0.9) * 0.03
               + cos((pos.x + pos.z) * 1.5 + uTime * 0.7) * 0.02;
    pos.y += wave;
    vWave = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const waterFragmentShader = `
  uniform float uTime;
  uniform vec3 uDeepCol;
  uniform vec3 uMidCol;
  uniform vec3 uShallowCol;
  uniform vec3 uNearCol;
  uniform vec3 uSkyCol;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    vec2 uv = vUv;
    vec2 center = uv - 0.5;
    float dist = length(center);

    float rings = dist * 8.0 - uTime * 0.35;
    float ringMask = sin(rings * 3.14159) * 0.5 + 0.5;
    float bandSharp = smoothstep(0.3, 0.7, ringMask);

    float d = clamp(1.0 - dist * 2.0, 0.0, 1.0);
    vec3 deepCol    = uDeepCol;
    vec3 midCol     = uMidCol;
    vec3 shallowCol = uShallowCol;
    vec3 nearCol    = uNearCol;

    float t1 = clamp(d * 3.0, 0.0, 1.0);
    float t2 = clamp(d * 3.0 - 1.0, 0.0, 1.0);
    float t3 = clamp(d * 3.0 - 2.0, 0.0, 1.0);
    vec3 baseColor = mix(deepCol, midCol, t1);
    baseColor = mix(baseColor, shallowCol, t2);
    baseColor = mix(baseColor, nearCol, t3);

    // Sky reflection — deep water reflects the sky, ripple-distorted
    float reflectDist = clamp(dist * 2.5, 0.0, 1.0);
    // Ripple distortion of the reflection
    float ripple = sin(uv.x * 28.0 - uTime * 1.6) * 0.012
                 + cos(uv.y * 22.0 + uTime * 1.1) * 0.010;
    float rippleFactor = clamp(vWave * 8.0 + 0.5 + ripple * 4.0, 0.0, 1.0);
    // Reflection is strongest in deep (outer) water
    float reflectStrength = (1.0 - d) * 0.22;
    vec3 reflectedSky = mix(uSkyCol * 0.85, uSkyCol * 1.1, rippleFactor * 0.5);
    baseColor = mix(baseColor, reflectedSky, reflectStrength);

    // Blend ring bands into color — lighter bands = shallower-looking
    vec3 ringHighlight = baseColor + vec3(0.08, 0.12, 0.08) * bandSharp;

    // Animated caustic pattern — overlapping sine grids create bright spots
    float cx1 = sin(uv.x * 18.0 + uTime * 0.8) * sin(uv.y * 14.0 + uTime * 0.6);
    float cx2 = sin(uv.x * 11.0 - uTime * 0.5) * sin(uv.y * 20.0 + uTime * 0.9);
    float caustic = clamp((cx1 + cx2) * 0.5 + 0.5, 0.0, 1.0);
    caustic = pow(caustic, 3.5) * 0.22;
    // Caustics are strongest in shallow (near shore) water
    caustic *= clamp(1.0 - d * 1.5, 0.0, 1.0);

    // Shore foam — bright white ring at island edge
    float foamRing = smoothstep(0.42, 0.45, dist) * (1.0 - smoothstep(0.45, 0.50, dist));
    foamRing *= (sin(dist * 80.0 - uTime * 3.0) * 0.5 + 0.5);

    // Small ripple highlights on wave crests
    float spec = clamp(vWave * 20.0, 0.0, 1.0);

    // Scrolling foam streaks
    float foam = smoothstep(0.82, 0.88, sin(uv.x * 22.0 + uTime * 1.1) * 0.5 + 0.5)
               * smoothstep(0.82, 0.88, sin(uv.y * 18.0 - uTime * 0.8) * 0.5 + 0.5)
               * 0.5;

    vec3 color = ringHighlight + vec3(caustic * 0.5, caustic * 0.7, caustic);
    color = mix(color, vec3(0.95, 1.0, 1.0), foamRing * 0.9 + spec * 0.4 + foam * 0.25);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ─── Procedural textures ─────────────────────────────────────────────────────
function makeTex(fn: (ctx: CanvasRenderingContext2D) => void, size = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  fn(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

function grassTex() {
  return makeTex(ctx => {
    // Rich saturated voxel green
    ctx.fillStyle = '#3aaa4a';
    ctx.fillRect(0, 0, 128, 128);
    // Broad dark shadow patches for depth
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = `rgba(10,55,18,${0.10 + Math.random() * 0.16})`;
      ctx.beginPath();
      ctx.ellipse(Math.random()*128, Math.random()*128, 12+Math.random()*22, 8+Math.random()*14, Math.random()*Math.PI, 0, Math.PI*2);
      ctx.fill();
    }
    // Medium variation patches
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(8,80,20,${0.10 + Math.random() * 0.18})`;
      ctx.beginPath();
      ctx.ellipse(Math.random()*128, Math.random()*128, 3+Math.random()*10, 2+Math.random()*6, Math.random()*Math.PI, 0, Math.PI*2);
      ctx.fill();
    }
    // Lighter highlight flecks — subtle, not neon
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(100,200,80,${0.05 + Math.random() * 0.09})`;
      ctx.fillRect(Math.random()*128, Math.random()*128, 1+Math.random()*4, 1+Math.random()*2);
    }
    // Fine blade strokes
    for (let i = 0; i < 80; i++) {
      const x = Math.random()*128, y = Math.random()*128;
      ctx.strokeStyle = `rgba(5,50,10,${0.18 + Math.random()*0.18})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x, y+5); ctx.bezierCurveTo(x+1, y+3, x+2, y+1, x+Math.random()*2-1, y); ctx.stroke();
    }
  });
}

function sandTex() {
  return makeTex(ctx => {
    // Warm golden sand — rich voxel palette
    ctx.fillStyle = '#e8c87a';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 180; i++) {
      const v = 0.80 + Math.random() * 0.30;
      ctx.fillStyle = `rgba(${Math.floor(230*v)},${Math.floor(155*v)},${Math.floor(30*v)},0.4)`;
      ctx.beginPath();
      ctx.ellipse(Math.random()*128, Math.random()*128, 1+Math.random()*3, 1+Math.random()*2, Math.random()*Math.PI, 0, Math.PI*2);
      ctx.fill();
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255,240,160,0.3)`;
      ctx.fillRect(Math.random()*128, Math.random()*128, 2+Math.random()*4, 1+Math.random()*2);
    }
  });
}

function dirtTex() {
  return makeTex(ctx => {
    // Rich dark brown soil — island underside
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 120; i++) {
      const v = 0.7 + Math.random() * 0.4;
      ctx.fillStyle = `rgba(${Math.floor(100*v)},${Math.floor(50*v)},${Math.floor(10*v)},0.5)`;
      ctx.beginPath();
      ctx.ellipse(Math.random()*128, Math.random()*128, 2+Math.random()*8, 2+Math.random()*6, Math.random()*Math.PI, 0, Math.PI*2);
      ctx.fill();
    }
    // Rock speckles
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(160,140,120,0.3)`;
      ctx.beginPath();
      ctx.arc(Math.random()*128, Math.random()*128, 1+Math.random()*2, 0, Math.PI*2);
      ctx.fill();
    }
  });
}

function pathTex() {
  return makeTex(ctx => {
    // Earthy terracotta path
    ctx.fillStyle = '#c4855a';
    ctx.fillRect(0, 0, 128, 128);
    // Broad worn patches
    for (let i = 0; i < 25; i++) {
      ctx.fillStyle = `rgba(140,85,35,${0.18 + Math.random()*0.22})`;
      ctx.beginPath();
      ctx.ellipse(Math.random()*128, Math.random()*128, 6+Math.random()*14, 3+Math.random()*7, Math.random()*Math.PI, 0, Math.PI*2);
      ctx.fill();
    }
    // Light dry-dust highlights
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(220,185,130,${0.18 + Math.random()*0.18})`;
      ctx.beginPath();
      ctx.ellipse(Math.random()*128, Math.random()*128, 2+Math.random()*5, 1+Math.random()*3, Math.random()*Math.PI, 0, Math.PI*2);
      ctx.fill();
    }
    // Embedded stones — rounded, varied grey tones
    for (let i = 0; i < 18; i++) {
      const r = 1.5 + Math.random()*2.5;
      const v = 0.55 + Math.random()*0.3;
      ctx.fillStyle = `rgba(${Math.floor(175*v)},${Math.floor(155*v)},${Math.floor(125*v)},0.65)`;
      ctx.beginPath();
      ctx.arc(Math.random()*128, Math.random()*128, r, 0, Math.PI*2);
      ctx.fill();
    }
    // Crack lines
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = `rgba(100,60,20,0.12)`;
      ctx.lineWidth = 0.7;
      const sx = Math.random()*128, sy = Math.random()*128;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.random()*20-10, sy + Math.random()*20-10); ctx.stroke();
    }
  });
}

function wallTex() {
  return makeTex(ctx => {
    ctx.fillStyle = '#f5e8c8';
    ctx.fillRect(0, 0, 128, 128);
    // Horizontal plank lines
    for (let y = 0; y < 128; y += 14) {
      ctx.fillStyle = 'rgba(160,120,60,0.15)';
      ctx.fillRect(0, y, 128, 1);
      ctx.fillStyle = 'rgba(255,245,210,0.3)';
      ctx.fillRect(0, y+1, 128, 2);
    }
    // Vertical wood grain
    for (let x = 0; x < 128; x += 18) {
      ctx.fillStyle = 'rgba(160,120,60,0.08)';
      ctx.fillRect(x, 0, 1, 128);
    }
    // Knots
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = 'rgba(140,100,50,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(Math.random()*128, Math.random()*128, 3, 2, Math.random()*Math.PI, 0, Math.PI*2);
      ctx.stroke();
    }
  });
}

// ─── Time-of-day color presets (5 stops: dawn, morning, afternoon, dusk, twilight) ──
const TOD_SKY     = [0xffb088, 0x87ceeb, 0x5bbde8, 0xff9068, 0x1e2250].map(c => new THREE.Color(c));
const TOD_SUN     = [0xff9060, 0xfff0c0, 0xffe8a0, 0xff8855, 0x405090].map(c => new THREE.Color(c));
const TOD_SUN_INT = [1.5, 1.8, 2.2, 1.4, 0.35];
const TOD_SUN_POS = [new THREE.Vector3(6,8,12), new THREE.Vector3(10,16,8), new THREE.Vector3(12,20,6), new THREE.Vector3(-6,8,-12), new THREE.Vector3(-5,4,-10)];
const TOD_HEMI_SKY = [0xffc080, 0xffd080, 0xffd080, 0xffa070, 0x2a2a6a].map(c => new THREE.Color(c));
const TOD_HEMI_GND = [0x806040, 0x80c860, 0x80c860, 0x705030, 0x181840].map(c => new THREE.Color(c));
const TOD_HEMI_INT = [0.7, 0.85, 0.9, 0.7, 0.45];
const TOD_FILL     = [0xffa080, 0xa0d8ff, 0x80d8ff, 0xffa080, 0x4050b0].map(c => new THREE.Color(c));
const TOD_FILL_INT = [0.3, 0.5, 0.65, 0.35, 0.3];
const TOD_W_DEEP    = [[0.04,0.12,0.38],[0.01,0.15,0.52],[0.02,0.22,0.65],[0.06,0.14,0.42],[0.02,0.07,0.28]].map(a => new THREE.Color(a[0],a[1],a[2]));
const TOD_W_MID     = [[0.05,0.28,0.55],[0.02,0.42,0.72],[0.02,0.55,0.82],[0.12,0.32,0.55],[0.03,0.12,0.38]].map(a => new THREE.Color(a[0],a[1],a[2]));
const TOD_W_SHALLOW = [[0.06,0.48,0.65],[0.00,0.65,0.72],[0.00,0.82,0.80],[0.22,0.48,0.58],[0.04,0.16,0.42]].map(a => new THREE.Color(a[0],a[1],a[2]));
const TOD_W_NEAR    = [[0.15,0.62,0.72],[0.14,0.78,0.80],[0.30,0.95,0.88],[0.40,0.60,0.65],[0.07,0.22,0.48]].map(a => new THREE.Color(a[0],a[1],a[2]));
const TOD_TORCH_INT = [0.0, 0.0, 0.0, 0.55, 1.0];  // torches: on at dusk, peak twilight
const TOD_WINDOW_INT = [0.0, 0.0, 0.12, 0.85, 1.0]; // windows: start at afternoon, full by dusk

function todLerp(arr: number[], t: number): number {
  const idx = t * 4, i = Math.min(Math.floor(idx), 3), f = idx - i;
  return arr[i] + (arr[i + 1] - arr[i]) * f;
}
function todLerpColor(arr: THREE.Color[], t: number, out: THREE.Color): THREE.Color {
  const idx = t * 4, i = Math.min(Math.floor(idx), 3), f = idx - i;
  return out.copy(arr[i]).lerp(arr[i + 1], f);
}
function todLerpVec3(arr: THREE.Vector3[], t: number, out: THREE.Vector3): THREE.Vector3 {
  const idx = t * 4, i = Math.min(Math.floor(idx), 3), f = idx - i;
  return out.copy(arr[i]).lerp(arr[i + 1], f);
}

// ─── Scene builder ────────────────────────────────────────────────────────────
interface HutRef {
  villa: VillaBook;
  group: THREE.Group;
  roofMesh: THREE.Mesh;
  gx: number;
  gz: number;
  worldX: number;
  worldZ: number;
  roofOrigColor: THREE.Color;
  glowRing: THREE.Mesh;
  glassMat: THREE.MeshLambertMaterial;
}

interface CaveRef {
  group: THREE.Group;
  gx: number;
  gz: number;
  worldX: number;
  worldZ: number;
  glowMesh: THREE.Mesh;
  wispMesh: THREE.Mesh;
  wispLight: THREE.PointLight;
}

function buildScene(scene: THREE.Scene): { hutRefs: HutRef[]; caveRef: CaveRef | null; cloudRefs: THREE.Group[]; torchFlames: THREE.Mesh[] } {
  const gTex = grassTex();
  const sTex = sandTex();
  const pTex = pathTex();
  const wTex = wallTex();
  const dTex = dirtTex();

  // ── Ground tiles ──
  const tileGeos = {
    grass: new THREE.BoxGeometry(1, 0.42, 1),
    sand:  new THREE.BoxGeometry(1, 0.28, 1),
    path:  new THREE.BoxGeometry(1, 0.34, 1),
  };
  const tileMats = {
    grass: new THREE.MeshLambertMaterial({ map: gTex }),
    sand:  new THREE.MeshLambertMaterial({ map: sTex }),
    path:  new THREE.MeshLambertMaterial({ map: pTex }),
  };
  const dirtMat = new THREE.MeshLambertMaterial({ map: dTex });

  // Count tiles by type for instanced rendering (massively fewer draw calls)
  let grassCount = 0, sandCount = 0, pathCount = 0;
  for (let gx = 0; gx < GRID; gx++)
    for (let gz = 0; gz < GRID; gz++) {
      if (!inIsland(gx, gz)) continue;
      if (isSand(gx, gz)) sandCount++;
      else if (isPath(gx, gz)) pathCount++;
      else grassCount++;
    }

  const grassInst = new THREE.InstancedMesh(tileGeos.grass, tileMats.grass, grassCount);
  grassInst.receiveShadow = true;
  const sandInst = new THREE.InstancedMesh(tileGeos.sand, tileMats.sand, sandCount);
  sandInst.receiveShadow = true;
  const pathInst = new THREE.InstancedMesh(tileGeos.path, tileMats.path, pathCount);
  pathInst.receiveShadow = true;
  const dirtInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.42, 1), dirtMat, sandCount);
  dirtInst.receiveShadow = true;

  // Grass checkerboard colors — alternating shades for voxel rhythm
  const grassColors = [
    new THREE.Color(0x3aaa4a), // even tiles: mid green
    new THREE.Color(0x4ec060), // odd tiles: lighter lime
    new THREE.Color(0x328840), // accent: slightly darker for edge variety
  ];

  // Raised plateau zones — 3 cluster rectangles that step up for visual interest
  // Each is { minGx, maxGx, minGz, maxGz, lift }
  const plateauZones = [
    { minGx: 3,  maxGx: 6,  minGz: 3,  maxGz: 5,  lift: 0.14 }, // NW
    { minGx: 14, maxGx: 17, minGz: 4,  maxGz: 6,  lift: 0.12 }, // NE
    { minGx: 11, maxGx: 14, minGz: 14, maxGz: 16, lift: 0.10 }, // SE corner
  ];
  const getPlateauLift = (gx: number, gz: number) => {
    for (const z of plateauZones) {
      if (gx >= z.minGx && gx <= z.maxGx && gz >= z.minGz && gz <= z.maxGz) return z.lift;
    }
    return 0;
  };

  let gi = 0, si = 0, pi = 0, di = 0;
  const _m4 = new THREE.Matrix4();
  for (let gx = 0; gx < GRID; gx++) {
    for (let gz = 0; gz < GRID; gz++) {
      if (!inIsland(gx, gz)) continue;
      const sand = isSand(gx, gz);
      const path = !sand && isPath(gx, gz);
      const h = sand ? 0.28 : path ? 0.34 : 0.42;
      const plateau = (!sand && !path) ? getPlateauLift(gx, gz) : 0;
      const hVar = (!sand && !path) ? (Math.sin(gx * 1.7 + gz * 2.3) * 0.05 + Math.cos(gx * 2.9 + gz * 1.1) * 0.025 + plateau) : 0;
      const wx = gx - HALF + 0.5, wz = gz - HALF + 0.5;
      if (sand) {
        _m4.makeTranslation(wx, h / 2, wz);
        sandInst.setMatrixAt(si++, _m4);
        _m4.makeTranslation(wx, -0.18, wz);
        dirtInst.setMatrixAt(di++, _m4);
      } else if (path) {
        _m4.makeTranslation(wx, h / 2, wz);
        pathInst.setMatrixAt(pi++, _m4);
      } else {
        _m4.makeTranslation(wx, h / 2 + hVar, wz);
        grassInst.setMatrixAt(gi, _m4);
        // Checkerboard: alternating two greens, with a rare accent on corners
        const checker = (gx + gz) % 2;
        const isCorner = gx % 4 === 0 && gz % 4 === 0;
        grassInst.setColorAt(gi, isCorner ? grassColors[2] : grassColors[checker]);
        gi++;
      }
    }
  }
  if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
  scene.add(grassInst, sandInst, pathInst, dirtInst);

  // ── Island cliff edges — vertical face slabs on perimeter tiles facing water ──
  const cliffMat = new THREE.MeshLambertMaterial({ color: 0xc8954e });
  const cliffH = 0.55; // height of the cliff face slab
  const cliffD = 0.14; // depth (thickness)
  const cliffGeo = new THREE.BoxGeometry(1, cliffH, cliffD);
  const dirs = [
    { dx: 0, dz: -1, rx: 0,   rz: -0.5 + cliffD / 2 }, // north face
    { dx: 0, dz:  1, rx: 0,   rz:  0.5 - cliffD / 2 }, // south face
    { dx: -1,dz:  0, rx: -0.5 + cliffD / 2, rz: 0   }, // west face
    { dx:  1,dz:  0, rx:  0.5 - cliffD / 2, rz: 0   }, // east face
  ];
  for (let gx = 0; gx < GRID; gx++) {
    for (let gz = 0; gz < GRID; gz++) {
      if (!inIsland(gx, gz)) continue;
      const wx = gx - HALF + 0.5, wz = gz - HALF + 0.5;
      const tileH = isSand(gx, gz) ? 0.28 : isPath(gx, gz) ? 0.34 : 0.42;
      for (const dir of dirs) {
        const nx = gx + dir.dx, nz = gz + dir.dz;
        if (!inIsland(nx, nz)) {
          const cliffMesh = new THREE.Mesh(cliffGeo, cliffMat);
          if (dir.dz !== 0) {
            // north/south: slab faces Z axis
            cliffMesh.position.set(wx, tileH / 2 - cliffH / 2, wz + dir.rz);
          } else {
            // east/west: slab faces X axis — rotate 90° around Y
            cliffMesh.rotation.y = Math.PI / 2;
            cliffMesh.position.set(wx + dir.rx, tileH / 2 - cliffH / 2, wz);
          }
          cliffMesh.receiveShadow = true;
          scene.add(cliffMesh);
        }
      }
    }
  }

  // ── Tile-edge AO strips — thin dark strips at grass tile crevices ──
  // These fake ambient occlusion between adjacent tiles, making blocks pop.
  {
    const aoMat = new THREE.MeshBasicMaterial({ color: 0x1a4a22, transparent: true, opacity: 0.55 });
    const aoGeoNS = new THREE.BoxGeometry(1.0, 0.07, 0.06); // north/south edge strip
    const aoGeoEW = new THREE.BoxGeometry(0.06, 0.07, 1.0); // east/west edge strip
    const aoY = 0.385; // just below grass top surface
    for (let gx = 1; gx < GRID - 1; gx++) {
      for (let gz = 1; gz < GRID - 1; gz++) {
        if (!inIsland(gx, gz) || isSand(gx, gz) || isPath(gx, gz)) continue;
        const wx = gx - HALF + 0.5, wz = gz - HALF + 0.5;
        // Only add strip where neighbour tile is also interior (grass/path) — skip water edges
        if (inIsland(gx, gz - 1) && !isSand(gx, gz - 1)) {
          const strip = new THREE.Mesh(aoGeoNS, aoMat);
          strip.position.set(wx, aoY, wz - 0.47);
          scene.add(strip);
        }
        if (inIsland(gx - 1, gz) && !isSand(gx - 1, gz)) {
          const strip = new THREE.Mesh(aoGeoEW, aoMat);
          strip.position.set(wx - 0.47, aoY, wz);
          scene.add(strip);
        }
      }
    }
  }

  // Also add a thick bottom soil disk so the island has a solid underside
  const soilDisk = new THREE.Mesh(
    new THREE.CylinderGeometry(GRID * 0.42, GRID * 0.38, 0.72, 24),
    dirtMat
  );
  soilDisk.position.set(0, -0.38, 0);
  scene.add(soilDisk);

  // ── Water (large animated plane) ──
  const waterGeo = new THREE.PlaneGeometry(80, 80, 48, 48);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.ShaderMaterial({
    vertexShader: waterVertexShader,
    fragmentShader: waterFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uDeepCol: { value: new THREE.Color(0.01, 0.15, 0.55) },
      uMidCol: { value: new THREE.Color(0.02, 0.45, 0.78) },
      uShallowCol: { value: new THREE.Color(0.00, 0.72, 0.78) },
      uNearCol: { value: new THREE.Color(0.28, 0.90, 0.85) },
      uSkyCol: { value: new THREE.Color(0x4fa8e8) },
    },
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = -0.18;
  water.userData.isWater = true;
  scene.add(water);

  // ── Beach decorations (sand tiles) ──
  const sandRng = (() => { let s = 42; return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; }; })();
  for (let gx = 0; gx < GRID; gx++) {
    for (let gz = 0; gz < GRID; gz++) {
      if (!isSand(gx, gz)) continue;
      const wx = gx - HALF + 0.5, wz = gz - HALF + 0.5;
      const r = sandRng();
      const S = 0.28; // sand top surface Y
      if (r < 0.08) {
        // Starfish
        const sfMat = new THREE.MeshLambertMaterial({ color: 0xe8844a });
        const sfBody = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 5), sfMat);
        sfBody.position.set(wx + sandRng()*0.5-0.25, S + 0.02, wz + sandRng()*0.5-0.25);
        sfBody.rotation.y = sandRng() * Math.PI;
        scene.add(sfBody);
      } else if (r < 0.14) {
        // Small seashell (flattened sphere)
        const shellMat = new THREE.MeshLambertMaterial({ color: 0xf0d0a0 });
        const shell = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), shellMat);
        shell.scale.y = 0.4;
        shell.position.set(wx + sandRng()*0.4-0.2, S + 0.015, wz + sandRng()*0.4-0.2);
        scene.add(shell);
      } else if (r < 0.18) {
        // Beach pebbles cluster
        for (let p = 0; p < 3; p++) {
          const pMat = new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(0.08, 0.2, 0.65 + sandRng()*0.2) });
          const peb = new THREE.Mesh(new THREE.SphereGeometry(0.05 + sandRng()*0.04, 5, 4), pMat);
          peb.scale.y = 0.5;
          peb.position.set(wx + sandRng()*0.5-0.25, S + 0.015, wz + sandRng()*0.5-0.25);
          scene.add(peb);
        }
      }
    }
  }

  // ── Ambient clouds (chunky cartoon-style, varied shapes) ──
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xf8fbff, transparent: true, opacity: 0.95 });
  const cloudTintMat = new THREE.MeshLambertMaterial({ color: 0xeef5ff, transparent: true, opacity: 0.88 });
  type CloudPuff = { px: number; py: number; pz: number; rx: number; ry: number; rz: number; r: number };
  const cloudDefs: Array<{ x: number; y: number; z: number; scale: number; puffs: CloudPuff[]; mat?: THREE.Material }> = [
    // Large puffy cumulus (main feature cloud)
    { x: -14, y: 8.5, z: -9, scale: 1.6, mat: cloudMat, puffs: [
      { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, r: 1.1 },
      { px: 1.5, py: -0.1, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.9 },
      { px: -1.4, py: -0.15, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.8 },
      { px: 0.6, py: 0.6, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.72 },
      { px: -0.5, py: 0.5, pz: 0.1, rx: 0, ry: 0, rz: 0, r: 0.62 },
      { px: 2.2, py: -0.3, pz: 0.1, rx: 0, ry: 0, rz: 0, r: 0.55 },
      { px: -2.1, py: -0.35, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.48 },
    ]},
    // Flat stratus band
    { x: 10, y: 8.2, z: -14, scale: 1.2, mat: cloudTintMat, puffs: [
      { px: 0, py: 0, pz: 0, rx: 0.5, ry: 0, rz: 0, r: 0.65 },
      { px: 1.5, py: 0, pz: 0, rx: 0.5, ry: 0, rz: 0, r: 0.56 },
      { px: 2.8, py: 0, pz: 0, rx: 0.5, ry: 0, rz: 0, r: 0.48 },
      { px: -1.4, py: 0, pz: 0, rx: 0.5, ry: 0, rz: 0, r: 0.52 },
      { px: 4.0, py: 0, pz: 0.2, rx: 0.5, ry: 0, rz: 0, r: 0.36 },
      { px: -2.5, py: 0, pz: 0.1, rx: 0.5, ry: 0, rz: 0, r: 0.30 },
    ]},
    // Big dramatic cumulus far right
    { x: 18, y: 7.5, z: 2, scale: 2.0, mat: cloudMat, puffs: [
      { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, r: 1.2 },
      { px: 1.6, py: -0.1, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.95 },
      { px: -1.5, py: -0.15, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.82 },
      { px: 0.7, py: 0.62, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.76 },
      { px: 2.7, py: -0.28, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.65 },
      { px: -0.4, py: 0.9, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.56 },
      { px: 3.5, py: -0.45, pz: 0.1, rx: 0, ry: 0, rz: 0, r: 0.48 },
    ]},
    // Small puffy cloud left
    { x: -18, y: 9, z: 4, scale: 1.1, mat: cloudMat, puffs: [
      { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.75 },
      { px: 1.0, py: -0.1, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.62 },
      { px: -0.9, py: -0.1, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.55 },
      { px: 0.3, py: 0.45, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.48 },
    ]},
    // Wispy high cloud
    { x: 3, y: 10.5, z: -17, scale: 1.4, mat: cloudTintMat, puffs: [
      { px: 0, py: 0, pz: 0, rx: 0.5, ry: 0, rz: 0.2, r: 0.50 },
      { px: 1.1, py: 0.1, pz: 0, rx: 0.5, ry: 0, rz: 0.2, r: 0.42 },
      { px: 2.2, py: 0.15, pz: 0, rx: 0.5, ry: 0, rz: 0.2, r: 0.34 },
      { px: -1.1, py: 0, pz: 0, rx: 0.5, ry: 0, rz: 0.2, r: 0.38 },
      { px: 3.3, py: 0.2, pz: 0.1, rx: 0.5, ry: 0, rz: 0.2, r: 0.26 },
    ]},
    // Extra cloud — upper right
    { x: 8, y: 9, z: 15, scale: 1.3, mat: cloudMat, puffs: [
      { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.88 },
      { px: 1.2, py: -0.1, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.72 },
      { px: -1.1, py: -0.12, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.65 },
      { px: 0.4, py: 0.5, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.55 },
      { px: 2.0, py: -0.25, pz: 0, rx: 0, ry: 0, rz: 0, r: 0.48 },
    ]},
  ];
  const cloudRefs: THREE.Group[] = [];
  for (const cd of cloudDefs) {
    const cg = new THREE.Group();
    const baseOpacity = (cd.mat === cloudTintMat) ? 0.88 : 0.95;
    // Each cloud gets its own material instance so opacity can be controlled per-cloud
    const mat = new THREE.MeshLambertMaterial({
      color: (cd.mat === cloudTintMat) ? 0xeef5ff : 0xf8fbff,
      transparent: true,
      opacity: baseOpacity,
    });
    for (const pf of cd.puffs) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(pf.r, 8, 6), mat);
      m.position.set(pf.px, pf.py, pf.pz);
      m.rotation.set(pf.rx, pf.ry, pf.rz);
      cg.add(m);
    }
    cg.position.set(cd.x, cd.y, cd.z);
    cg.scale.setScalar(cd.scale);
    cg.userData.cloudSpeed = 0.0006 + Math.random() * 0.001;
    cg.userData.baseOpacity = baseOpacity;
    cg.userData.cloudMat = mat;
    cloudRefs.push(cg);
    scene.add(cg);
  }

  // ── Decorations ──
  // Per-tile deterministic RNG seeded by position — immune to changes in
  // which tiles are skipped (hut clearance, cave relocation, etc.).
  const makeTileRng = (gx: number, gz: number) => {
    let s = ((gx * 1619 + gz * 6997 + 137) & 0x7fffffff) || 1;
    return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  };

  for (let gx = 1; gx < GRID - 1; gx++) {
    for (let gz = 1; gz < GRID - 1; gz++) {
      if (!inIsland(gx, gz) || isSand(gx, gz) || isPath(gx, gz)) continue;
      if (isNearHut(gx, gz)) continue;
      const rng = makeTileRng(gx, gz);
      const r = rng();
      const wx = gx - HALF + 0.5, wz = gz - HALF + 0.5;

      const G = 0.42; // grass top surface Y
      if (r < 0.055) {
        // Tree: thick trunk + CHUNKY round foliage ball (voxel style)
        const trunkH = 0.5 + rng() * 0.4;
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.16, trunkH, 6),
          new THREE.MeshLambertMaterial({ color: 0x7a4a18 })
        );
        trunk.position.set(wx, G + trunkH/2, wz);
        trunk.castShadow = true;
        scene.add(trunk);

        // Big round foliage ball — voxel-chunky, flat-shaded for sculptural look
        const foliageR = 0.72 + rng() * 0.32;
        const foliageColors = [0x0ea832, 0x18c038, 0x25d845, 0x12a028];
        const fColor = foliageColors[Math.floor(rng() * foliageColors.length)];
        const foliage = new THREE.Mesh(
          new THREE.SphereGeometry(foliageR, 10, 8),
          new THREE.MeshLambertMaterial({ color: fColor, flatShading: true })
        );
        foliage.position.set(wx, G + trunkH + foliageR * 0.75, wz);
        foliage.castShadow = true;
        scene.add(foliage);
        // Secondary accent blobs for fuller silhouette
        const accentR1 = foliageR * 0.62;
        const accentBlob1 = new THREE.Mesh(
          new THREE.SphereGeometry(accentR1, 9, 7),
          new THREE.MeshLambertMaterial({ color: new THREE.Color(fColor).multiplyScalar(0.82), flatShading: true })
        );
        accentBlob1.position.set(wx - foliageR * 0.55, G + trunkH + foliageR * 0.45, wz + foliageR * 0.3);
        accentBlob1.castShadow = true;
        scene.add(accentBlob1);
        const accentR2 = foliageR * 0.5;
        const accentBlob2 = new THREE.Mesh(
          new THREE.SphereGeometry(accentR2, 9, 7),
          new THREE.MeshLambertMaterial({ color: new THREE.Color(fColor).multiplyScalar(0.92), flatShading: true })
        );
        accentBlob2.position.set(wx + foliageR * 0.48, G + trunkH + foliageR * 0.9, wz - foliageR * 0.28);
        accentBlob2.castShadow = true;
        scene.add(accentBlob2);
        // Small accent sphere on top (apple tree / fruit)
        if (rng() > 0.55) {
          const fruitColors = [0xff3020, 0xff6010, 0xffcc00, 0xff88aa];
          const fMat = new THREE.MeshLambertMaterial({ color: fruitColors[Math.floor(rng()*fruitColors.length)] });
          for (let fi = 0; fi < 3 + Math.floor(rng()*3); fi++) {
            const fa = rng() * Math.PI * 2, fr = foliageR * 0.75;
            const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), fMat);
            fruit.position.set(wx + Math.cos(fa)*fr, G + trunkH + foliageR * 0.75 + Math.sin(rng()*Math.PI)*fr*0.6, wz + Math.sin(fa)*fr);
            scene.add(fruit);
          }
        }
      } else if (r < 0.065) {
        // Stacked-cone pine tree — tall triangular silhouette (voxel-style)
        const pineTrunkH = 0.35 + rng() * 0.2;
        const pineTrunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.11, pineTrunkH, 6),
          new THREE.MeshLambertMaterial({ color: 0x6b3a18 })
        );
        pineTrunk.position.set(wx, G + pineTrunkH / 2, wz);
        pineTrunk.castShadow = true;
        scene.add(pineTrunk);
        const pineColors = [0x1a7a28, 0x228838, 0x186624, 0x2a9040];
        const pineColor = pineColors[Math.floor(rng() * pineColors.length)];
        const pineMat = new THREE.MeshLambertMaterial({ color: pineColor, flatShading: true });
        const pineDarkMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(pineColor).multiplyScalar(0.72), flatShading: true });
        // Three stacked cone layers — widest at bottom, narrowest at top
        const coneLayers = [
          { r: 0.60, h: 0.52, y: G + pineTrunkH + 0.26, mat: pineDarkMat },
          { r: 0.44, h: 0.48, y: G + pineTrunkH + 0.62, mat: pineMat },
          { r: 0.28, h: 0.40, y: G + pineTrunkH + 0.96, mat: pineDarkMat },
        ];
        for (const layer of coneLayers) {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(layer.r, layer.h, 6), layer.mat);
          cone.position.set(wx, layer.y, wz);
          cone.castShadow = true;
          scene.add(cone);
        }
        // Snow cap tip (white accent)
        if (rng() > 0.6) {
          const snowCap = new THREE.Mesh(
            new THREE.ConeGeometry(0.12, 0.18, 5),
            new THREE.MeshLambertMaterial({ color: 0xeef4f8 })
          );
          snowCap.position.set(wx, G + pineTrunkH + 1.32, wz);
          scene.add(snowCap);
        }
      } else if (r < 0.085) {
        // Banana tree — broad leaves, yellow fruit clusters
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.13, 0.8, 6),
          new THREE.MeshLambertMaterial({ color: 0x7a9a30 })
        );
        trunk.position.set(wx, G + 0.4, wz);
        trunk.castShadow = true;
        scene.add(trunk);
        const leafMat = new THREE.MeshLambertMaterial({ color: 0x0ebb28, side: THREE.DoubleSide });
        for (let j = 0; j < 5; j++) {
          const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.9), leafMat);
          const la = (j / 5) * Math.PI * 2;
          leaf.position.set(wx + Math.cos(la)*0.3, G + 0.9, wz + Math.sin(la)*0.3);
          leaf.rotation.set(-0.4, la, 0.15 * (rng()-0.5));
          leaf.castShadow = true;
          scene.add(leaf);
        }
        // Banana bunch
        if (rng() > 0.4) {
          const bananaCluster = new THREE.Mesh(
            new THREE.SphereGeometry(0.14, 6, 4),
            new THREE.MeshLambertMaterial({ color: 0xffdd00 })
          );
          bananaCluster.scale.set(0.7, 1.2, 0.7);
          bananaCluster.position.set(wx + 0.15, G + 0.72, wz + 0.2);
          scene.add(bananaCluster);
        }
      } else if (r < 0.095) {
        // Flower — very bright and punchy
        const colors = [0xff1870, 0xffcc00, 0xff5500, 0xcc44ff, 0xffffff, 0xff2040, 0x00ddff];
        const fc = colors[Math.floor(rng() * colors.length)];
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.022, 0.022, 0.28, 5),
          new THREE.MeshLambertMaterial({ color: 0x18aa18 })
        );
        stem.position.set(wx, G + 0.14, wz);
        scene.add(stem);
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 8, 6),
          new THREE.MeshLambertMaterial({ color: fc, flatShading: true })
        );
        head.position.set(wx, G + 0.34, wz);
        scene.add(head);
        // Yellow center
        const center = new THREE.Mesh(
          new THREE.SphereGeometry(0.055, 6, 5),
          new THREE.MeshLambertMaterial({ color: 0xffee00 })
        );
        center.position.set(wx, G + 0.34, wz + 0.1);
        scene.add(center);
      } else if (r < 0.115) {
        // Rock cluster — cool grey-blue voxel style
        const rockColors = [0x9098a8, 0xa8a0b8, 0x8890a0, 0xb8b0c0];
        const rockMat = new THREE.MeshLambertMaterial({ color: rockColors[Math.floor(rng()*rockColors.length)] });
        for (let i = 0; i < 2 + Math.floor(rng() * 3); i++) {
          const s = 0.14 + rng() * 0.16;
          const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
          rock.position.set(wx + (rng()-0.5)*0.32, G + s*0.5, wz + (rng()-0.5)*0.32);
          rock.rotation.set(rng()*Math.PI, rng()*Math.PI, rng()*Math.PI);
          rock.castShadow = true;
          scene.add(rock);
        }
      } else if (r < 0.128) {
        // Fern cluster — low spreading fronds
        const fernMat = new THREE.MeshLambertMaterial({ color: 0x2d8c2d, side: THREE.DoubleSide });
        for (let j = 0; j < 4 + Math.floor(rng() * 3); j++) {
          const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.42), fernMat);
          const fa = rng() * Math.PI * 2;
          frond.position.set(wx + Math.cos(fa)*0.2, G + 0.12, wz + Math.sin(fa)*0.2);
          frond.rotation.set(-0.6 + rng()*0.3, fa, rng()*0.2);
          scene.add(frond);
        }
      } else if (r < 0.138) {
        // Tall grass tuft
        const grassMat = new THREE.MeshLambertMaterial({ color: 0x30e848, side: THREE.DoubleSide });
        for (let j = 0; j < 5; j++) {
          const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.38), grassMat);
          blade.position.set(wx + (rng()-0.5)*0.22, G + 0.19, wz + (rng()-0.5)*0.22);
          blade.rotation.set((rng()-0.5)*0.4, rng()*Math.PI, 0);
          scene.add(blade);
        }
      } else if (r < 0.148) {
        // Glowing mushroom — more vivid cap colors
        const capColors = [0xff2060, 0xff1111, 0xff8800, 0xcc00ff, 0x0088ff];
        const cap = capColors[Math.floor(rng() * capColors.length)];
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.075, 0.24, 6),
          new THREE.MeshLambertMaterial({ color: 0xfff0d8 })
        );
        stem.position.set(wx, G + 0.12, wz);
        scene.add(stem);
        const capMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.19, 8, 6, 0, Math.PI*2, 0, Math.PI*0.55),
          new THREE.MeshLambertMaterial({ color: cap, emissive: new THREE.Color(cap).multiplyScalar(0.20), flatShading: true })
        );
        capMesh.position.set(wx, G + 0.28, wz);
        scene.add(capMesh);
        // White spots
        for (let si = 0; si < 3; si++) {
          const spot = new THREE.Mesh(
            new THREE.SphereGeometry(0.032, 5, 4),
            new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
          );
          const sa = si * Math.PI * 2 / 3 + 0.5;
          spot.position.set(wx + Math.cos(sa)*0.1, G + 0.32, wz + Math.sin(sa)*0.1);
          scene.add(spot);
        }
      } else if (r < 0.158) {
        // Crystal cluster — more vivid colors, bigger
        const crystalColors = [0x00eeff, 0xcc44ff, 0x44ffcc, 0xffaa00, 0xff44aa];
        const cc = crystalColors[Math.floor(rng() * crystalColors.length)];
        for (let i = 0; i < 2 + Math.floor(rng() * 4); i++) {
          const ch = 0.22 + rng() * 0.35;
          const crystal = new THREE.Mesh(
            new THREE.ConeGeometry(0.055 + rng()*0.05, ch, 4),
            new THREE.MeshLambertMaterial({ color: cc, transparent: true, opacity: 0.82, emissive: new THREE.Color(cc).multiplyScalar(0.25) })
          );
          crystal.position.set(wx + (rng()-0.5)*0.28, G + ch/2, wz + (rng()-0.5)*0.28);
          crystal.rotation.set((rng()-0.5)*0.3, rng()*Math.PI*2, (rng()-0.5)*0.15);
          crystal.castShadow = true;
          scene.add(crystal);
        }
      }
    }
  }

  // ── Beach palm trees — voxel-style with chunky flat-box fronds ──
  for (let i = 0; i < 22; i++) {
    const rng = makeTileRng(i * 97 + 1, i * 53 + 1);
    const angle = (i / 22) * Math.PI * 2;
    const r2 = GRID * 0.37 + rng() * 0.7;
    const gxf = HALF + Math.cos(angle) * r2;
    const gzf = HALF + Math.sin(angle) * r2;
    const gxi = Math.round(gxf), gzi = Math.round(gzf);
    if (!isSand(gxi, gzi)) continue;
    const wx = gxf - HALF, wz = gzf - HALF;
    const lean = (rng() - 0.5) * 0.32;
    const h = 1.3 + rng() * 0.7;

    // Segmented trunk — stacked boxes for a voxel-chunky look
    const palmBase = 0.28; // sand top Y
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a5c28 });
    const segments = 4 + Math.floor(rng() * 3);
    for (let s = 0; s < segments; s++) {
      const segH = h / segments;
      const segW = 0.18 - s * 0.02;
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(segW, segH - 0.02, segW),
        trunkMat
      );
      seg.position.set(
        wx + Math.sin(lean) * (s + 0.5) * segH,
        palmBase + (s + 0.5) * segH,
        wz
      );
      seg.castShadow = true;
      scene.add(seg);
    }

    // Tip position
    const tipX = wx + Math.sin(lean) * h;
    const tipY = palmBase + h;
    const tipZ = wz;

    // Voxel palm crown: a small flat box "crown cap" + wide flat frond boxes
    const palmColors = [0x08c830, 0x12dc38, 0x00be28, 0x1ad040];
    const frondColor = palmColors[Math.floor(rng() * 4)];
    const frondMat = new THREE.MeshLambertMaterial({ color: frondColor });
    const darkFrondMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(frondColor).multiplyScalar(0.7) });

    // Crown cap — chunky flat box sitting on top of trunk
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.18, 0.55),
      frondMat
    );
    crown.position.set(tipX, tipY + 0.09, tipZ);
    crown.castShadow = true;
    scene.add(crown);

    // 6–8 wide flat frond boxes radiating outward + drooping
    const numFronds = 6 + Math.floor(rng() * 3);
    for (let j = 0; j < numFronds; j++) {
      const la = (j / numFronds) * Math.PI * 2 + rng() * 0.2;
      const frondLen = 0.65 + rng() * 0.35;
      const frondW = 0.22 + rng() * 0.1;
      const frondThick = 0.1;

      // Outer droop segment (hangs down)
      const outerFrond = new THREE.Mesh(
        new THREE.BoxGeometry(frondW, frondThick, frondLen * 0.55),
        j % 2 === 0 ? frondMat : darkFrondMat
      );
      const reach = frondLen * 0.45;
      const droop = -0.22 - rng() * 0.18;
      outerFrond.position.set(
        tipX + Math.cos(la) * reach,
        tipY + 0.18 + droop,
        tipZ + Math.sin(la) * reach
      );
      outerFrond.rotation.set(
        Math.atan2(droop + 0.1, reach) * 0.8,
        la,
        0
      );
      outerFrond.castShadow = true;
      scene.add(outerFrond);

      // Inner base segment (flat outward)
      const innerFrond = new THREE.Mesh(
        new THREE.BoxGeometry(frondW * 0.85, frondThick, frondLen * 0.35),
        frondMat
      );
      innerFrond.position.set(
        tipX + Math.cos(la) * (reach * 0.38),
        tipY + 0.18 - 0.04,
        tipZ + Math.sin(la) * (reach * 0.38)
      );
      innerFrond.rotation.y = la;
      innerFrond.castShadow = true;
      scene.add(innerFrond);
    }

    // Coconuts — clustered just below crown
    if (rng() > 0.40) {
      const coconutMat = new THREE.MeshLambertMaterial({ color: 0x7a4e22 });
      const numCoco = 2 + Math.floor(rng() * 3);
      for (let k = 0; k < numCoco; k++) {
        const ca = (k / numCoco) * Math.PI * 2;
        const co = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), coconutMat);
        co.position.set(
          tipX + Math.cos(ca) * 0.22,
          tipY - 0.05,
          tipZ + Math.sin(ca) * 0.22
        );
        scene.add(co);
      }
    }
  }

  // ── Dock & boat — placed at the south shore, just into the water ──
  // The island radius reaches ~GRID*0.42 = ~8.8 units from center.
  // South shore sand is around z = +8.0 to +8.5. Dock extends into water beyond z = +8.5.
  {
    const DOCK_X = 0.5;      // slight offset from island center
    const DOCK_Z_START = 7.2; // starts on sand
    const DOCK_Z_END = 9.8;   // extends into water
    const DOCK_Y = 0.20;

    const dockMat = new THREE.MeshLambertMaterial({ color: 0xb07838 });
    const pilesMat = new THREE.MeshLambertMaterial({ color: 0x7a4820 });

    // Deck planks — parallel boards along the dock
    for (let pi = 0; pi < 8; pi++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.10, 0.28), dockMat);
      plank.position.set(DOCK_X, DOCK_Y, DOCK_Z_START + pi * 0.34);
      scene.add(plank);
    }

    // Cross-beam under deck
    for (const pz of [DOCK_Z_START + 0.3, DOCK_Z_START + 1.4, DOCK_Z_END - 0.3]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.12), pilesMat);
      beam.position.set(DOCK_X, DOCK_Y - 0.1, pz);
      scene.add(beam);
    }

    // Piles (round posts driven into water/sand)
    for (const [px, pz] of [
      [DOCK_X - 0.38, DOCK_Z_START + 0.2],
      [DOCK_X + 0.38, DOCK_Z_START + 0.2],
      [DOCK_X - 0.38, DOCK_Z_END - 0.4],
      [DOCK_X + 0.38, DOCK_Z_END - 0.4],
    ] as [number,number][]) {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.85, 6), pilesMat);
      pile.position.set(px, DOCK_Y - 0.4, pz);
      scene.add(pile);
    }

    // Mooring post at end of dock
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.55, 6), dockMat);
    post.position.set(DOCK_X + 0.32, DOCK_Y + 0.2, DOCK_Z_END - 0.25);
    scene.add(post);

    // Small voxel boat floating beside dock
    const BOAT_X = DOCK_X + 1.5;
    const BOAT_Z = DOCK_Z_END - 0.8;
    const BOAT_Y = 0.06;
    const boatMat = new THREE.MeshLambertMaterial({ color: 0xe03018 });    // vivid red hull
    const boatTrimMat = new THREE.MeshLambertMaterial({ color: 0xfff0d8 }); // cream trim
    const boatDarkMat = new THREE.MeshLambertMaterial({ color: 0xa82010 });

    // Hull — chunky box
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 1.4), boatMat);
    hull.position.set(BOAT_X, BOAT_Y, BOAT_Z);
    scene.add(hull);

    // Hull sides (darker, thicker walls)
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 1.4), boatDarkMat);
    sideL.position.set(BOAT_X - 0.39, BOAT_Y + 0.04, BOAT_Z);
    scene.add(sideL);
    const sideR = sideL.clone();
    sideR.position.x = BOAT_X + 0.39;
    scene.add(sideR);

    // Front prow
    const prow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.26, 0.28), boatMat);
    prow.position.set(BOAT_X, BOAT_Y + 0.04, BOAT_Z - 0.8);
    prow.rotation.x = -0.35;
    scene.add(prow);

    // Deck surface
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.07, 1.0), boatTrimMat);
    deck.position.set(BOAT_X, BOAT_Y + 0.16, BOAT_Z + 0.15);
    scene.add(deck);

    // Mast
    const mastMat = new THREE.MeshLambertMaterial({ color: 0xa06030 });
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.0, 0.07), mastMat);
    mast.position.set(BOAT_X, BOAT_Y + 0.72, BOAT_Z + 0.1);
    scene.add(mast);

    // Sail — wide flat plane, bright white
    const sailMat = new THREE.MeshLambertMaterial({ color: 0xfffaf0, side: THREE.DoubleSide });
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.75), sailMat);
    sail.position.set(BOAT_X + 0.01, BOAT_Y + 0.72, BOAT_Z + 0.12);
    scene.add(sail);

    // Sail cross-spar (horizontal boom)
    const spar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.05), mastMat);
    spar.position.set(BOAT_X, BOAT_Y + 0.38, BOAT_Z + 0.12);
    scene.add(spar);
  }

  // ── Huts (unique style per act) ──
  const hutRefs: HutRef[] = [];

  for (const pos of HUT_POSITIONS) {
    const villa = VILLAS.find(v => v.slug === pos.slug);
    if (!villa) continue;

    const wx = pos.gx - HALF + 0.5;
    const wz = pos.gz - HALF + 0.5;
    const base = 0.18;
    const roofColor = new THREE.Color(villa.color);
    const roofMat = new THREE.MeshLambertMaterial({ color: roofColor });
    let roofMesh: THREE.Mesh;

    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, px: number, py: number, pz: number, cast = true, recv = false): THREE.Mesh => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(px, py, pz);
      if (cast) m.castShadow = true;
      if (recv) m.receiveShadow = true;
      scene.add(m);
      return m;
    };

    const woodMat = new THREE.MeshLambertMaterial({ map: wTex });
    const darkWood = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
    const stone = new THREE.MeshLambertMaterial({ color: 0xb0a898 });
    const whitewash = new THREE.MeshLambertMaterial({ color: 0xf0ece0 });
    const glass = new THREE.MeshLambertMaterial({ color: 0x88d8f0, transparent: true, opacity: 0.75 });
    const accent = new THREE.MeshLambertMaterial({ color: roofColor });
    const accentDark = new THREE.MeshLambertMaterial({ color: new THREE.Color(villa.color).multiplyScalar(0.6) });
    const bamboo = new THREE.MeshLambertMaterial({ color: 0xd4b86a });
    const concrete = new THREE.MeshLambertMaterial({ color: 0xd8d4cc });

    if (villa.slug === 'foundation') {
      // ── Act I Foundation: clean modernist white cube, Google + Gigwalk era ──
      // Raised platform
      add(new THREE.BoxGeometry(2.6, 0.15, 2.6), new THREE.MeshLambertMaterial({ color: 0xccc8c0 }), wx, base + 0.075, wz, false, true);
      // Main walls — white modernist
      add(new THREE.BoxGeometry(2.1, 1.15, 2.1), whitewash, wx, base + 0.15 + 0.575, wz, true, true);
      // Flat roof slab with wide overhang
      roofMesh = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 2.8), roofMat);
      roofMesh.position.set(wx, base + 0.15 + 1.15 + 0.07, wz);
      roofMesh.castShadow = true;
      scene.add(roofMesh);
      // Colored accent band under roof
      add(new THREE.BoxGeometry(2.12, 0.14, 2.12), accent, wx, base + 0.15 + 1.15, wz);
      // Chimney
      add(new THREE.BoxGeometry(0.22, 0.45, 0.22), concrete, wx + 0.65, base + 0.15 + 1.15 + 0.225, wz - 0.5);
      // Full-width glass door
      add(new THREE.BoxGeometry(0.6, 0.85, 0.07), glass, wx, base + 0.15 + 0.425, wz + 1.07);
      // Large picture windows
      add(new THREE.BoxGeometry(0.72, 0.52, 0.05), glass, wx - 0.62, base + 0.15 + 0.72, wz + 1.07);
      add(new THREE.BoxGeometry(0.72, 0.52, 0.05), glass, wx + 0.62, base + 0.15 + 0.72, wz + 1.07);
      // Side full-width window
      add(new THREE.BoxGeometry(0.05, 0.52, 0.9), glass, wx + 1.07, base + 0.15 + 0.72, wz);
      // Window mullions
      add(new THREE.BoxGeometry(0.03, 0.52, 0.04), new THREE.MeshLambertMaterial({ color: 0xaaa8a0 }), wx - 0.62, base + 0.15 + 0.72, wz + 1.08);
      add(new THREE.BoxGeometry(0.03, 0.52, 0.04), new THREE.MeshLambertMaterial({ color: 0xaaa8a0 }), wx + 0.62, base + 0.15 + 0.72, wz + 1.08);

    } else if (villa.slug === 'institution') {
      // ── Act II Healthcare Design: clean modern clinic — round plan, glass facade ──
      const clinicWhite = new THREE.MeshLambertMaterial({ color: 0xf2f0ec });
      const clinicGrey  = new THREE.MeshLambertMaterial({ color: 0xd8d4cc });
      // Circular foundation pad
      add(new THREE.CylinderGeometry(1.7, 1.8, 0.14, 16), clinicGrey, wx, base + 0.07, wz, false, true);
      // Main round walls — squat cylinder
      add(new THREE.CylinderGeometry(1.5, 1.55, 1.1, 16), clinicWhite, wx, base + 0.14 + 0.55, wz, true, true);
      // Flat roof slab with slight overhang
      roofMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.12, 16), roofMat);
      roofMesh.position.set(wx, base + 0.14 + 1.1 + 0.06, wz);
      roofMesh.castShadow = true;
      scene.add(roofMesh);
      // Roof parapet ring (white trim)
      add(new THREE.TorusGeometry(1.7, 0.06, 4, 20), clinicWhite, wx, base + 0.14 + 1.1 + 0.12, wz);
      // Rooftop medical cross — vertical
      add(new THREE.BoxGeometry(0.14, 0.48, 0.14), new THREE.MeshLambertMaterial({ color: 0xffffff }), wx, base + 0.14 + 1.1 + 0.36, wz);
      // Rooftop medical cross — horizontal
      add(new THREE.BoxGeometry(0.42, 0.14, 0.14), new THREE.MeshLambertMaterial({ color: 0xffffff }), wx, base + 0.14 + 1.1 + 0.44, wz);
      // Front entry canopy
      add(new THREE.BoxGeometry(1.0, 0.08, 0.55), roofMat, wx, base + 0.14 + 1.1, wz + 1.6);
      add(new THREE.CylinderGeometry(0.045, 0.06, 0.9, 6), clinicGrey, wx - 0.38, base + 0.14 + 0.45, wz + 1.87);
      add(new THREE.CylinderGeometry(0.045, 0.06, 0.9, 6), clinicGrey, wx + 0.38, base + 0.14 + 0.45, wz + 1.87);
      // Glass entry doors
      add(new THREE.BoxGeometry(0.36, 0.72, 0.06), glass, wx - 0.19, base + 0.14 + 0.36, wz + 1.55);
      add(new THREE.BoxGeometry(0.36, 0.72, 0.06), glass, wx + 0.19, base + 0.14 + 0.36, wz + 1.55);
      // Strip windows around the cylinder at 4 cardinal azimuths
      for (const [ox, oz] of [[0, 1.52],[ 1.52, 0],[0,-1.52],[-1.52,0]] as [number,number][]) {
        add(new THREE.BoxGeometry(0.55, 0.36, 0.06), glass, wx + ox, base + 0.14 + 0.74, wz + oz);
      }

    } else if (villa.slug === 'ai-turn') {
      // ── Act III AI Turn: bamboo + crystal observatory, double thatched dome ──
      // Stone base ring
      add(new THREE.CylinderGeometry(1.45, 1.55, 0.18, 10), new THREE.MeshLambertMaterial({ color: 0xc0b898 }), wx, base + 0.09, wz, false, true);
      // Bamboo cylinder walls
      add(new THREE.CylinderGeometry(1.1, 1.15, 1.1, 10), bamboo, wx, base + 0.18 + 0.55, wz, true, true);
      // Bamboo vertical staves (decorative)
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        add(new THREE.CylinderGeometry(0.035, 0.04, 1.1, 5),
          new THREE.MeshLambertMaterial({ color: 0xbfa040 }),
          wx + Math.cos(a)*1.1, base + 0.18 + 0.55, wz + Math.sin(a)*1.1);
      }
      // Lower dome
      add(new THREE.SphereGeometry(1.35, 12, 7, 0, Math.PI*2, 0, Math.PI*0.45), roofMat, wx, base + 0.18 + 1.1 + 0.15, wz);
      // Upper dome (smaller cap)
      roofMesh = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 6, 0, Math.PI*2, 0, Math.PI*0.45), roofMat);
      roofMesh.position.set(wx, base + 0.18 + 1.1 + 0.55, wz);
      roofMesh.castShadow = true;
      scene.add(roofMesh);
      // Finial crystal spike
      add(new THREE.ConeGeometry(0.07, 0.42, 4), new THREE.MeshLambertMaterial({ color: 0xc8d8ff, transparent: true, opacity: 0.9, emissive: new THREE.Color(0x6688ff).multiplyScalar(0.25) }), wx, base + 0.18 + 1.1 + 0.9 + 0.21, wz);
      // Crystals ringing the base
      const cMat = new THREE.MeshLambertMaterial({ color: 0xa8c8ff, transparent: true, opacity: 0.78, emissive: new THREE.Color(0x4466ff).multiplyScalar(0.18) });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const ch = 0.28 + (i % 3) * 0.12;
        const cr = add(new THREE.ConeGeometry(0.045, ch, 4), cMat, wx + Math.cos(a)*1.45, base + 0.18 + ch/2, wz + Math.sin(a)*1.45);
        cr.rotation.y = a + 0.2;
        cr.rotation.z = (Math.random()-0.5)*0.2;
      }
      // Arched door
      add(new THREE.BoxGeometry(0.42, 0.7, 0.08), bamboo, wx, base + 0.18 + 0.35, wz + 1.17);
      add(new THREE.CylinderGeometry(0.21, 0.21, 0.08, 10, 1, false, 0, Math.PI), bamboo, wx, base + 0.18 + 0.7, wz + 1.17);
      // Circular windows
      add(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12), glass, wx + 0.72, base + 0.18 + 0.72, wz + 0.88);
      add(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12), glass, wx - 0.72, base + 0.18 + 0.72, wz + 0.88);

    } else if (villa.slug === 'builder-era') {
      // ── Act IV Builder Era: elevated hex treehouse on stilts, workshop vibe ──
      // Tall stilts
      for (const [sx, sz] of [[-0.7,-0.7],[0.7,-0.7],[-0.7,0.7],[0.7,0.7],[0,0.85],[-0.85,0]] as [number,number][]) {
        add(new THREE.CylinderGeometry(0.065, 0.085, 1.05, 6), new THREE.MeshLambertMaterial({ color: 0x7a5c28 }), wx+sx, base + 0.525, wz+sz);
      }
      // Platform / floor
      add(new THREE.CylinderGeometry(1.15, 1.2, 0.12, 6), new THREE.MeshLambertMaterial({ color: 0xc8a040 }), wx, base + 1.05 + 0.06, wz, false, true);
      // Walls — hex
      add(new THREE.CylinderGeometry(0.98, 1.0, 1.0, 6), woodMat, wx, base + 1.05 + 0.12 + 0.5, wz, true, true);
      // Railing posts
      const railMat = new THREE.MeshLambertMaterial({ color: 0x9b7d45 });
      for (let a = 0; a < 12; a++) {
        const ra = (a / 12) * Math.PI * 2;
        add(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 4), railMat, wx + Math.cos(ra)*1.12, base + 1.05 + 0.12 + 0.175, wz + Math.sin(ra)*1.12);
      }
      add(new THREE.TorusGeometry(1.12, 0.025, 4, 20), railMat, wx, base + 1.05 + 0.12 + 0.35, wz);
      // Hexagonal roof
      roofMesh = new THREE.Mesh(new THREE.ConeGeometry(1.42, 1.05, 6), roofMat);
      roofMesh.position.set(wx, base + 1.05 + 0.12 + 1.0 + 0.525, wz);
      roofMesh.castShadow = true;
      scene.add(roofMesh);
      // Chimney pipe (workshop)
      add(new THREE.CylinderGeometry(0.065, 0.07, 0.5, 6), new THREE.MeshLambertMaterial({ color: 0x555550 }), wx + 0.5, base + 1.05 + 0.12 + 1.0 + 0.25, wz - 0.4);
      // Ladder
      const lMat = darkWood;
      add(new THREE.BoxGeometry(0.06, 1.05, 0.06), lMat, wx - 0.15, base + 0.525, wz + 0.82);
      add(new THREE.BoxGeometry(0.06, 1.05, 0.06), lMat, wx + 0.15, base + 0.525, wz + 0.82);
      for (let r = 0; r < 6; r++) add(new THREE.BoxGeometry(0.36, 0.055, 0.055), lMat, wx, base + 0.08 + r * 0.17, wz + 0.82);
      // Door
      add(new THREE.BoxGeometry(0.4, 0.62, 0.07), darkWood, wx, base + 1.05 + 0.12 + 0.31, wz + 1.0);
      // Windows (hex sides)
      add(new THREE.BoxGeometry(0.42, 0.32, 0.06), glass, wx + 0.62, base + 1.05 + 0.12 + 0.65, wz + 0.72);
      add(new THREE.BoxGeometry(0.42, 0.32, 0.06), glass, wx - 0.62, base + 1.05 + 0.12 + 0.65, wz + 0.72);
      // Work light (warm orange glow above door)
      const workLight = add(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshLambertMaterial({ color: 0xffa040, emissive: new THREE.Color(0xffa040).multiplyScalar(0.6) }), wx, base + 1.05 + 0.12 + 1.0 + 0.08, wz + 1.0);
      void workLight;

    } else { // what's-next
      // ── Act V What's Next: lighthouse / beacon tower ──
      // Stone base
      add(new THREE.CylinderGeometry(1.1, 1.25, 0.22, 12), new THREE.MeshLambertMaterial({ color: 0xc0b8a8 }), wx, base + 0.11, wz, false, true);
      // Main tower body
      add(new THREE.CylinderGeometry(0.72, 0.88, 2.4, 12), new THREE.MeshLambertMaterial({ color: 0xeeeadf }), wx, base + 0.22 + 1.2, wz, true, true);
      // Horizontal rings (striped)
      for (let i = 0; i < 4; i++) {
        add(new THREE.TorusGeometry(0.82 - i*0.024, 0.04, 4, 16),
          new THREE.MeshLambertMaterial({ color: new THREE.Color(villa.color).multiplyScalar(0.7) }),
          wx, base + 0.22 + 0.5 + i * 0.48, wz);
      }
      // Lantern room — glass enclosure
      add(new THREE.CylinderGeometry(0.82, 0.72, 0.4, 12), new THREE.MeshLambertMaterial({ color: 0xd8d4cc }), wx, base + 0.22 + 2.4 + 0.2, wz);
      add(new THREE.CylinderGeometry(0.72, 0.72, 0.45, 12), new THREE.MeshLambertMaterial({ color: 0xaad8f0, transparent: true, opacity: 0.68 }), wx, base + 0.22 + 2.4 + 0.6 + 0.225, wz);
      // Beacon light (gold glow)
      roofMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 10, 7),
        new THREE.MeshLambertMaterial({ color: villa.color, emissive: new THREE.Color(villa.color).multiplyScalar(0.5) })
      );
      roofMesh.position.set(wx, base + 0.22 + 2.4 + 0.6 + 0.35, wz);
      roofMesh.castShadow = true;
      scene.add(roofMesh);
      // Roof cone
      add(new THREE.ConeGeometry(0.88, 0.55, 12), roofMat, wx, base + 0.22 + 2.4 + 0.6 + 0.62 + 0.275, wz);
      // Railing at top
      add(new THREE.TorusGeometry(0.85, 0.035, 4, 18), new THREE.MeshLambertMaterial({ color: 0x888880 }), wx, base + 0.22 + 2.4 + 0.35, wz);
      // Door
      add(new THREE.BoxGeometry(0.36, 0.72, 0.07), darkWood, wx, base + 0.22 + 0.36, wz + 0.88);
      add(new THREE.SphereGeometry(0.18, 8, 5, 0, Math.PI*2, 0, Math.PI*0.5), darkWood, wx, base + 0.22 + 0.72, wz + 0.88);
      // Small windows
      add(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 10), glass, wx + 0.52, base + 0.22 + 1.2, wz + 0.58);
      add(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 10), glass, wx - 0.42, base + 0.22 + 1.7, wz + 0.58);
    }

    // Glow ring (white ground indicator)
    const ringGeo = new THREE.RingGeometry(0.9, 1.3, 20);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const glowRing = new THREE.Mesh(ringGeo, ringMat);
    glowRing.position.set(wx, 0.13, wz);
    scene.add(glowRing);

    hutRefs.push({
      villa,
      group: new THREE.Group(),
      roofMesh: roofMesh!,
      gx: pos.gx, gz: pos.gz,
      worldX: wx, worldZ: wz,
      roofOrigColor: roofColor.clone(),
      glowRing,
      glassMat: glass,
    });
  }

  // ── Torches and fires (visible at dusk/night) ──
  const torchFlames: THREE.Mesh[] = [];
  const postMat = new THREE.MeshLambertMaterial({ color: 0x5a3a18 });
  const stoneMat2 = new THREE.MeshLambertMaterial({ color: 0x888078 });

  const addTorch = (tx: number, ty: number, tz: number) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.7, 5), postMat);
    post.position.set(tx, ty + 0.35, tz);
    post.castShadow = true;
    scene.add(post);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 5), new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0 }));
    flame.position.set(tx, ty + 0.78, tz);
    flame.userData.lightType = 'torch';
    scene.add(flame);
    torchFlames.push(flame);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.32, 7, 5), new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0, depthWrite: false }));
    halo.position.set(tx, ty + 0.78, tz);
    halo.userData.lightType = 'torchHalo';
    scene.add(halo);
    torchFlames.push(halo);
  };

  for (const pos of HUT_POSITIONS) {
    const wx = pos.gx - HALF + 0.5;
    const wz = pos.gz - HALF + 0.5;
    addTorch(wx + 1.4, 0.18, wz + 0.8);
    addTorch(wx - 1.4, 0.18, wz - 0.8);
  }

  // Path torches at the 4 compass arms of the central cross
  const cx = HALF - 0.5; // center in world coords = 0.5
  addTorch(0.5, 0.18, -5.0);   // north arm
  addTorch(0.5, 0.18,  5.8);   // south arm
  addTorch(-5.0, 0.18, 0.5);   // west arm
  addTorch(5.8, 0.18,  0.5);   // east arm
  void cx;

  // Central campfire at the plaza crossing
  const fireX = 0.5, fireZ = 0.5;
  const fireRockGeo = new THREE.DodecahedronGeometry(0.1, 0);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const rock = new THREE.Mesh(fireRockGeo, stoneMat2);
    rock.position.set(fireX + Math.cos(a) * 0.28, 0.42, fireZ + Math.sin(a) * 0.28);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    rock.scale.setScalar(0.8 + Math.random() * 0.4);
    scene.add(rock);
  }
  const logMat = new THREE.MeshLambertMaterial({ color: 0x5a2e10 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.42, 5), logMat);
    log.position.set(fireX + Math.cos(a) * 0.12, 0.42, fireZ + Math.sin(a) * 0.12);
    log.rotation.set(Math.PI / 2.5, a, 0);
    scene.add(log);
  }
  const campFlame = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 6), new THREE.MeshBasicMaterial({ color: 0xff9a20, transparent: true, opacity: 0 }));
  campFlame.position.set(fireX, 0.65, fireZ);
  campFlame.userData.lightType = 'campfire';
  scene.add(campFlame);
  torchFlames.push(campFlame);
  const campHalo = new THREE.Mesh(new THREE.SphereGeometry(0.52, 7, 6), new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0, depthWrite: false }));
  campHalo.position.set(fireX, 0.65, fireZ);
  campHalo.userData.lightType = 'campfireHalo';
  scene.add(campHalo);
  torchFlames.push(campHalo);

  // ── Cave easter egg (east-center, stone archway with wooden door) ──
  let caveRef: CaveRef | null = null;
  {
    // Beach cove — open sandy inlet at the eastern shore
    const cx = CAVE_POSITION.gx - HALF + 0.5;
    const cz = CAVE_POSITION.gz - HALF + 0.5;
    const coveBase = 0.28; // sits at sand height

    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, px: number, py: number, pz: number, cast = true): THREE.Mesh => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(px, py, pz);
      if (cast) m.castShadow = true;
      scene.add(m);
      return m;
    };

    const rockMat  = new THREE.MeshLambertMaterial({ color: 0x8a8070, flatShading: true });
    const darkRock = new THREE.MeshLambertMaterial({ color: 0x4a4540, flatShading: true });
    const sandMat  = new THREE.MeshLambertMaterial({ color: 0xe8d5a3 });

    // Sandy floor of the cove — extends slightly east beyond the tile
    add(new THREE.BoxGeometry(1.8, 0.12, 1.4), sandMat, cx + 0.3, coveBase - 0.04, cz);

    // ── North rock wall ──
    add(new THREE.BoxGeometry(0.55, 0.72, 0.48), rockMat, cx - 0.30, coveBase + 0.36, cz - 0.65);
    add(new THREE.BoxGeometry(0.48, 0.55, 0.44), rockMat, cx + 0.28, coveBase + 0.28, cz - 0.68);
    add(new THREE.BoxGeometry(0.36, 0.44, 0.38), darkRock, cx + 0.62, coveBase + 0.22, cz - 0.60);
    add(new THREE.SphereGeometry(0.32, 6, 5), rockMat, cx - 0.70, coveBase + 0.26, cz - 0.58);
    add(new THREE.SphereGeometry(0.25, 6, 4), darkRock, cx + 0.90, coveBase + 0.18, cz - 0.52);

    // ── South rock wall ──
    add(new THREE.BoxGeometry(0.55, 0.72, 0.48), rockMat, cx - 0.30, coveBase + 0.36, cz + 0.65);
    add(new THREE.BoxGeometry(0.48, 0.55, 0.44), rockMat, cx + 0.28, coveBase + 0.28, cz + 0.68);
    add(new THREE.BoxGeometry(0.36, 0.44, 0.38), darkRock, cx + 0.62, coveBase + 0.22, cz + 0.60);
    add(new THREE.SphereGeometry(0.32, 6, 5), rockMat, cx - 0.70, coveBase + 0.26, cz + 0.58);
    add(new THREE.SphereGeometry(0.25, 6, 4), darkRock, cx + 0.90, coveBase + 0.18, cz + 0.52);

    // ── Back rock face (east wall, darker — the "deep" of the cove) ──
    add(new THREE.BoxGeometry(1.50, 0.90, 0.44), darkRock, cx + 1.0, coveBase + 0.45, cz);
    add(new THREE.SphereGeometry(0.42, 7, 5), darkRock, cx + 1.1, coveBase + 0.72, cz - 0.28);
    add(new THREE.SphereGeometry(0.38, 6, 4), darkRock, cx + 1.1, coveBase + 0.68, cz + 0.28);

    // ── Shadow pool — dark water hint inside ──
    const poolMat = new THREE.MeshLambertMaterial({ color: 0x1a2c40, transparent: true, opacity: 0.72 });
    add(new THREE.BoxGeometry(1.0, 0.04, 0.90), poolMat, cx + 0.7, coveBase + 0.02, cz, false);

    // ── Weathered driftwood post — visual landmark ──
    const driftMat = new THREE.MeshLambertMaterial({ color: 0xb8a07a });
    add(new THREE.CylinderGeometry(0.05, 0.07, 0.70, 6), driftMat, cx - 0.55, coveBase + 0.35, cz - 0.30);

    // ── Small glowing lantern on a rope strung at the cove entrance ──
    // Rope post left
    add(new THREE.CylinderGeometry(0.04, 0.05, 0.85, 6), driftMat, cx - 0.58, coveBase + 0.42, cz - 0.50);
    // Rope post right
    add(new THREE.CylinderGeometry(0.04, 0.05, 0.85, 6), driftMat, cx - 0.58, coveBase + 0.42, cz + 0.50);

    const glowMat = new THREE.MeshLambertMaterial({
      color: 0xffcc66,
      transparent: true,
      opacity: 0.90,
      emissive: new THREE.Color(0xff9900).multiplyScalar(0.8),
    });
    // Lantern sphere hanging between the posts
    const glowMesh = add(
      new THREE.SphereGeometry(0.09, 8, 6),
      glowMat,
      cx - 0.58, coveBase + 0.84, cz,
      false
    );

    // Tiny scattered pebbles at the entrance
    const pebMat = new THREE.MeshLambertMaterial({ color: 0xc0b090 });
    for (let p = 0; p < 5; p++) {
      const px2 = cx - 0.4 + (p * 0.18);
      const pz2 = cz + (p % 2 === 0 ? 0.25 : -0.22);
      add(new THREE.SphereGeometry(0.055 + p * 0.008, 5, 4), pebMat, px2, coveBase + 0.055, pz2, false);
    }

    // ── Dusk/twilight wisp — floating orb visible only at dusk+, hints at the easter egg ──
    const wispMat = new THREE.MeshLambertMaterial({
      color: 0xaa88ff,
      transparent: true,
      opacity: 0,
      emissive: new THREE.Color(0x8844ff),
    });
    const wispMesh = add(new THREE.SphereGeometry(0.11, 8, 6), wispMat, cx - 0.58, coveBase + 1.55, cz, false);
    wispMesh.visible = false;

    // Small point light that only activates at dusk — gives the cove a purple glow
    const wispLight = new THREE.PointLight(0x9966ff, 0, 3.5);
    wispLight.position.set(cx - 0.58, coveBase + 1.55, cz);
    scene.add(wispLight);

    caveRef = {
      group: new THREE.Group(),
      gx: CAVE_POSITION.gx,
      gz: CAVE_POSITION.gz,
      worldX: cx,
      worldZ: cz,
      glowMesh,
      wispMesh,
      wispLight,
    };
  }

  return { hutRefs, caveRef, cloudRefs, torchFlames };
}

// ─── Player builder ───────────────────────────────────────────────────────────
function buildPlayer(scene: THREE.Scene): THREE.Group {
  const g = new THREE.Group();

  const add = (geo: THREE.BufferGeometry, color: number, px: number, py: number, pz: number, cast = true) => {
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
    m.position.set(px, py, pz);
    if (cast) m.castShadow = true;
    g.add(m);
    return m;
  };

  // Legs
  const legGeo = new THREE.BoxGeometry(0.14, 0.28, 0.14);
  add(legGeo, 0x2c3e50, -0.08, 0.14, 0);
  add(legGeo, 0x2c3e50,  0.08, 0.14, 0);
  // Feet
  add(new THREE.BoxGeometry(0.12, 0.07, 0.18), 0x1a1a2e, -0.08, 0.02, 0.02);
  add(new THREE.BoxGeometry(0.12, 0.07, 0.18), 0x1a1a2e,  0.08, 0.02, 0.02);
  // Body
  add(new THREE.BoxGeometry(0.36, 0.32, 0.22), 0x2980b9, 0, 0.42, 0);
  // Head
  add(new THREE.BoxGeometry(0.32, 0.3, 0.28), 0xf5d6b8, 0, 0.7, 0);
  // Hair
  add(new THREE.BoxGeometry(0.34, 0.1, 0.3), 0x5d3a1a, 0, 0.83, 0);
  // Eyes
  add(new THREE.BoxGeometry(0.06, 0.06, 0.04), 0x1a1a2e, -0.08, 0.7, 0.14);
  add(new THREE.BoxGeometry(0.06, 0.06, 0.04), 0x1a1a2e,  0.08, 0.7, 0.14);
  // Arms
  add(new THREE.BoxGeometry(0.12, 0.28, 0.14), 0x2980b9, -0.26, 0.42, 0);
  add(new THREE.BoxGeometry(0.12, 0.28, 0.14), 0x2980b9,  0.26, 0.42, 0);
  // Hands
  add(new THREE.BoxGeometry(0.10, 0.09, 0.10), 0xf5d6b8, -0.26, 0.28, 0);
  add(new THREE.BoxGeometry(0.10, 0.09, 0.10), 0xf5d6b8,  0.26, 0.28, 0);

  scene.add(g);
  return g;
}

// ─── NPC builder ──────────────────────────────────────────────────────────────
function buildNpc(scene: THREE.Scene, wx: number, wz: number, id: string): THREE.Group {
  const g = new THREE.Group();
  const isGuide = id === 'guide';
  const bodyColor = isGuide ? 0xe8a030 : 0x7c4daa; // orange guide, purple historian
  const hatColor  = isGuide ? 0x3a6630 : 0x2c3a6a;

  const add = (geo: THREE.BufferGeometry, color: number, px: number, py: number, pz: number) => {
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
    m.position.set(px, py, pz);
    m.castShadow = true;
    g.add(m);
    return m;
  };

  add(new THREE.BoxGeometry(0.14, 0.26, 0.14), 0x2c3e50, -0.07, 0.13, 0); // leg L
  add(new THREE.BoxGeometry(0.14, 0.26, 0.14), 0x2c3e50,  0.07, 0.13, 0); // leg R
  add(new THREE.BoxGeometry(0.12, 0.07, 0.18), 0x1a1a2e, -0.07, 0.02, 0.02); // foot L
  add(new THREE.BoxGeometry(0.12, 0.07, 0.18), 0x1a1a2e,  0.07, 0.02, 0.02); // foot R
  add(new THREE.BoxGeometry(0.34, 0.30, 0.20), bodyColor, 0, 0.40, 0);    // body
  add(new THREE.BoxGeometry(0.30, 0.28, 0.26), 0xf5c8a0, 0, 0.67, 0);     // head
  add(new THREE.BoxGeometry(0.32, 0.06, 0.28), hatColor,  0, 0.80, 0);    // hat brim
  add(new THREE.BoxGeometry(0.22, 0.18, 0.22), hatColor,  0, 0.93, 0);    // hat top
  add(new THREE.BoxGeometry(0.05, 0.05, 0.03), 0x222222, -0.07, 0.68, 0.13); // eye L
  add(new THREE.BoxGeometry(0.05, 0.05, 0.03), 0x222222,  0.07, 0.68, 0.13); // eye R
  add(new THREE.BoxGeometry(0.11, 0.26, 0.12), bodyColor, -0.24, 0.40, 0); // arm L
  add(new THREE.BoxGeometry(0.11, 0.26, 0.12), bodyColor,  0.24, 0.40, 0); // arm R
  add(new THREE.BoxGeometry(0.10, 0.09, 0.10), 0xf5c8a0, -0.24, 0.27, 0); // hand L
  add(new THREE.BoxGeometry(0.10, 0.09, 0.10), 0xf5c8a0,  0.24, 0.27, 0); // hand R

  // Floating speech bubble indicator
  const bubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
  );
  bubble.position.set(0.25, 1.15, 0);
  bubble.userData.isBubble = true;
  g.add(bubble);

  g.position.set(wx, 0.18, wz);
  // Face player direction on spawn
  g.rotation.y = isGuide ? -Math.PI * 0.25 : Math.PI * 0.1;
  scene.add(g);
  return g;
}

// ─── React component ──────────────────────────────────────────────────────────
interface ActiveHut {
  villa: VillaBook;
  screenX: number;
  screenY: number;
  worldX: number;
  worldZ: number;
}

export interface IslandGameHandle {
  restoreFocus: () => void;
}

interface IslandGameProps {
  onEnterVilla?: (villa: VillaBook) => void;
  onEnterCave?: (cave: CaveBook) => void;
}

interface ActiveNpc {
  id: string;
  screenX: number;
  screenY: number;
  visitCount?: number;
}

interface TeleportState {
  target: { x: number; z: number };
  villa: VillaBook;
  phase: 'shrink' | 'move' | 'grow';
  progress: number;
}

// ── Keyboard key illustration ─────────────────────────────────────────────────
const KeyCap = ({ children, wide }: { children: React.ReactNode; wide?: boolean }) => (
  <kbd style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,250,240,0.92)', border: '1.5px solid rgba(160,120,60,0.3)',
    borderBottom: '3px solid rgba(140,100,40,0.45)',
    borderRadius: 5,
    padding: wide ? '3px 10px' : '3px 6px',
    minWidth: wide ? 68 : 26, height: 26,
    fontSize: 10, color: 'rgba(50,32,12,0.82)', fontFamily: 'monospace', fontWeight: 700,
    letterSpacing: '0.04em', userSelect: 'none',
  }}>
    {children}
  </kbd>
);

// ── Shared parchment card micro-components ────────────────────────────────
const ParchmentCorners = () => (
  <>
    <div className="absolute top-2 left-2 w-4 h-4 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(120,70,10,0.20) 0%, transparent 70%)' }} />
    <div className="absolute top-2 right-2 w-4 h-4 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(120,70,10,0.20) 0%, transparent 70%)' }} />
    <div className="absolute bottom-2 left-2 w-4 h-4 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(120,70,10,0.14) 0%, transparent 70%)' }} />
    <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(120,70,10,0.14) 0%, transparent 70%)' }} />
  </>
);
const AccentRule = ({ className = 'mb-5' }: { className?: string }) => (
  <div className={`w-20 h-px mx-auto ${className}`} style={{ background: 'linear-gradient(to right, transparent, rgba(155,95,18,0.72), transparent)' }} />
);
const ParchmentTextures = () => (
  <>
    <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: 'inherit', opacity: 0.35, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(100,55,10,0.07) 3px, rgba(100,55,10,0.07) 4px)' }} />
    <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: 'inherit', background: 'radial-gradient(ellipse at center, transparent 48%, rgba(80,38,0,0.13) 100%)' }} />
  </>
);
const ParchmentString = () => (
  <div className="w-px h-6 mt-px" style={{ background: 'linear-gradient(to bottom, rgba(140,100,40,0.65), transparent)' }} />
);

const IslandGame = forwardRef<IslandGameHandle, IslandGameProps>(({ onEnterVilla, onEnterCave }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const hutRefsRef = useRef<HutRef[]>([]);
  const caveRefRef = useRef<CaveRef | null>(null);
  const showNavRef = useRef(false);
  const playerEntrancePhase = useRef<'waiting' | 'dropping' | 'puff' | 'done'>('waiting');
  const playerEntranceTRef = useRef(0);
  const puffParticlesRef = useRef<{ mesh: THREE.Mesh; vx: number; vz: number }[]>([]);
  const npcGroupsRef = useRef<Array<{ id: string; group: THREE.Group; wx: number; wz: number; bubble: THREE.Mesh | null; bodyMats: THREE.MeshLambertMaterial[]; glowRing: THREE.Mesh; wander?: { homeX: number; homeZ: number; targetX: number; targetZ: number; nextMoveAt: number } }>>([]);
  const cloudRefsRef = useRef<THREE.Group[]>([]);
  const sunRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiRef = useRef<THREE.HemisphereLight | null>(null);
  const fillRef = useRef<THREE.DirectionalLight | null>(null);
  const torchFlamesRef = useRef<THREE.Mesh[]>([]);
  const composerRef = useRef<EffectComposer | null>(null);
  const gtaoPassRef = useRef<GTAOPass | null>(null);
  const skyObjectRef = useRef<Sky | null>(null);
  const caveEnteredRef = useRef(false);
  const timeOfDayRef = useRef(0.1);
  const keysRef = useRef<Set<string>>(new Set());
  const posRef = useRef({ x: 0, z: -1 });
  const playerVelRef = useRef({ x: 0, z: 0 });
  const rafRef = useRef(0);
  const frameRef = useRef(0);
  const waterMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clickMovingRef = useRef(false);
  const focusedRef = useRef(false);
  const arrowRef = useRef<THREE.Mesh | null>(null);
  const teleportRef = useRef<TeleportState | null>(null);
  const hoveredHutRef = useRef<ActiveHut | null>(null);
  const isHoveredTooltipRef = useRef(false);
  const hoveredHutClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Camera orbit state
  const orbitAngleRef = useRef(Math.PI / 4);
  const isSpinningRef = useRef(false);

  // Pan mode (space hold + drag to orbit)
  const spaceDownTimeRef = useRef(0);
  const isPanningRef = useRef(false);
  const lastMouseXRef = useRef(0);
  const viewSizeRef = useRef(8);                 // orthographic half-size
  const viewSizeBaseRef = useRef(8);             // reference for aspect recalc

  const [activeHut, setActiveHut] = useState<ActiveHut | null>(null);
  const [activeNpc, setActiveNpc] = useState<ActiveNpc | null>(null);
  const [chatNpc, setChatNpc] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);
  const [focused, setFocused] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hoveredHut, setHoveredHut] = useState<ActiveHut | null>(null);
  const [timeOfDay, setTimeOfDay] = useState(0.1);
  const [showNav, setShowNav] = useState(false);       // nav tutorial after title
  const [showNavModal, setShowNavModal] = useState(false); // nav button → modal
  const [showControls, setShowControls] = useState(false); // mobile controls panel
  const [titleCardExiting, setTitleCardExiting] = useState(false);
  const [navCardExiting, setNavCardExiting] = useState(false);
  const isTouchDevice = useRef(typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));

  // Touch state refs for D-pad, orbit, and pinch
  const touchOrbitStartXRef = useRef(0);
  const touchOrbitStartYRef = useRef(0);
  const touchOrbitActiveRef = useRef(false);
  const pinchStartDistRef = useRef(0);
  const activeTouchesRef = useRef(0);

  const music = useIslandMusic();

  useImperativeHandle(ref, () => ({
    restoreFocus() {
      focusedRef.current = true;
      setFocused(true);
      mountRef.current?.focus();
    },
  }));

  // Project hut 3D coords → screen coords, clamped so the tooltip card stays fully in-viewport.
  // padX/padY are half the tooltip card dimensions — keep the anchor point that far from the edges.
  const projectToScreen = useCallback((wx: number, wz: number, wy: number, padX = 120, padY = 180): { x: number; y: number } | null => {
    const camera = cameraRef.current;
    const mount = mountRef.current;
    if (!camera || !mount) return null;
    const v = new THREE.Vector3(wx, wy, wz).project(camera);
    const rawX = (v.x * 0.5 + 0.5) * mount.clientWidth;
    const rawY = (-v.y * 0.5 + 0.5) * mount.clientHeight;
    return {
      x: Math.max(padX, Math.min(mount.clientWidth - padX, rawX)),
      y: Math.max(padY, Math.min(mount.clientHeight - 20, rawY)),
    };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x8ecde6, 1); // atmospheric sky
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
    mount.appendChild(renderer.domElement);
    const initW = mount.clientWidth || 900;
    const initH = mount.clientHeight || 500;
    renderer.setSize(initW, initH);
    rendererRef.current = renderer;

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x8ab8cc, 0.006);
    scene.background = null;
    sceneRef.current = scene;

    // Physically-based sky — Three.js Sky (Preetham atmospheric scattering)
    const sky = new Sky();
    sky.scale.setScalar(450);
    scene.add(sky);
    skyObjectRef.current = sky;
    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = 4;
    skyUniforms['rayleigh'].value = 1.5;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.7;
    // Initial sun position matches TOD = 0.1 (just after dawn)
    skyUniforms['sunPosition'].value.set(8, 4, 6);

    // ── 3-light rig ──
    const hemi = new THREE.HemisphereLight(0xffd080, 0x80c860, 0.9);
    scene.add(hemi);
    hemiRef.current = hemi;

    const sun = new THREE.DirectionalLight(0xffe8a0, 2.2);
    sun.position.set(12, 20, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -22;
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    sunRef.current = sun;

    const fill = new THREE.DirectionalLight(0x80d8ff, 0.65);
    fill.position.set(-10, 12, -8);
    scene.add(fill);
    fillRef.current = fill;

    // Warm bounce light — subtle upward fill from ground
    const bounce = new THREE.HemisphereLight(0xffe0b0, 0x6aaa55, 0.3);
    scene.add(bounce);

    // ── Camera ──
    const aspect = initW / initH;
    const viewSize = viewSizeRef.current;
    const camera = new THREE.OrthographicCamera(
      -viewSize * aspect, viewSize * aspect,
      viewSize, -viewSize,
      0.1, 120
    );
    const camDist = 20;
    const camHeight = 18;
    camera.position.set(
      Math.sin(orbitAngleRef.current) * camDist,
      camHeight,
      Math.cos(orbitAngleRef.current) * camDist
    );
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // ── Post-processing pipeline ──
    const composer = new EffectComposer(renderer);
    composerRef.current = composer;

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // GTAO — ambient occlusion between voxel tile crevices
    const gtaoPass = new GTAOPass(scene, camera, initW, initH);
    gtaoPass.output = GTAOPass.OUTPUT.Default;
    gtaoPass.blendIntensity = 1.0;
    const gtaoAlgo = gtaoPass.algorithm as { samples: number; radius: number; distanceExponent: number; thickness: number };
    if (gtaoAlgo) {
      gtaoAlgo.samples = 16;
      gtaoAlgo.radius = 0.5;
      gtaoAlgo.distanceExponent = 2.0;
      gtaoAlgo.thickness = 1.0;
    }
    gtaoPassRef.current = gtaoPass;
    composer.addPass(gtaoPass);

    // Bloom — selective glow on emissive elements
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(initW, initH),
      0.35, // strength
      0.5,  // radius
      0.88  // threshold — only the brightest emissives bloom
    );
    composer.addPass(bloomPass);

    // SMAA — better anti-aliasing than WebGLRenderer antialias alone
    const smaaPass = new SMAAPass(initW, initH);
    composer.addPass(smaaPass);

    // Final output (applies tone mapping correctly after passes)
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // ── Build scene ──
    const { hutRefs, caveRef, cloudRefs, torchFlames } = buildScene(scene);
    hutRefsRef.current = hutRefs;
    caveRefRef.current = caveRef;
    cloudRefsRef.current = cloudRefs;
    torchFlamesRef.current = torchFlames;

    // Find water material ref
    scene.traverse(obj => {
      if ((obj as THREE.Mesh).userData?.isWater) {
        waterMatRef.current = (obj as THREE.Mesh).material as THREE.ShaderMaterial;
      }
    });

    // ── Player — starts hidden above the island until nav is dismissed ──
    const player = buildPlayer(scene);
    player.position.set(posRef.current.x, 5.0, posRef.current.z);
    player.visible = false;
    playerRef.current = player;

    // Green Sims-style orientation arrow (bobs + fades out, shown after landing)
    const arrowMat = new THREE.MeshLambertMaterial({
      color: 0x22ee44, transparent: true, opacity: 0,
      emissive: new THREE.Color(0x11aa33),
    });
    const arrowMesh = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 4), arrowMat);
    arrowMesh.rotation.x = Math.PI;
    arrowMesh.position.set(0, 1.35, 0);
    arrowMesh.visible = false;
    player.add(arrowMesh);
    arrowRef.current = arrowMesh;

    // ── Puff burst particles (expand + fade on landing) ──
    const puffMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    const puffGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const puffs: { mesh: THREE.Mesh; vx: number; vz: number }[] = [];
    const puffAngles = [0, 1, 2, 3, 4, 5].map(i => (i / 6) * Math.PI * 2);
    for (const angle of puffAngles) {
      const m = new THREE.Mesh(puffGeo, puffMat.clone());
      m.position.set(posRef.current.x, 0.3, posRef.current.z);
      m.visible = false;
      m.castShadow = false;
      scene.add(m);
      puffs.push({ mesh: m, vx: Math.cos(angle) * 0.06, vz: Math.sin(angle) * 0.06 });
    }
    puffParticlesRef.current = puffs;

    // ── NPCs (cache bubble + body material refs + glow rings for perf) ──
    const npcRingGeo = new THREE.RingGeometry(0.5, 0.75, 16);
    npcRingGeo.rotateX(-Math.PI / 2);
    npcGroupsRef.current = NPC_POSITIONS.map(npc => {
      const group = buildNpc(scene, npc.wx, npc.wz, npc.id);
      let bubble: THREE.Mesh | null = null;
      const bodyMats: THREE.MeshLambertMaterial[] = [];
      group.traverse(child => {
        if (child instanceof THREE.Mesh) {
          if (child.userData?.isBubble) bubble = child as THREE.Mesh;
          else bodyMats.push(child.material as THREE.MeshLambertMaterial);
        }
      });
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
      const glowRing = new THREE.Mesh(npcRingGeo, ringMat);
      glowRing.position.set(npc.wx, 0.13, npc.wz);
      scene.add(glowRing);
      return {
        id: npc.id, group, wx: npc.wx, wz: npc.wz, bubble, bodyMats, glowRing,
        wander: npc.id === 'guide' ? { homeX: npc.wx, homeZ: npc.wz, targetX: npc.wx, targetZ: npc.wz, nextMoveAt: 0, velX: 0, velZ: 0 } : undefined,
      };
    });

    // ── Input ──
    const onDown = (e: KeyboardEvent) => {
      if (!focusedRef.current) return;
      const k = e.key.toLowerCase();
      if (k === 'escape' && chatNpcRef.current) {
        setChatNpc(null);
        return;
      }
      if (chatNpcRef.current || teleportRef.current) return;
      if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)) {
        e.preventDefault();
        keysRef.current.add(k);
        if (moveIntervalRef.current) {
          clearInterval(moveIntervalRef.current);
          moveIntervalRef.current = null;
          clickMovingRef.current = false;
        }
      }
      if (k === ' ' || e.key === ' ') {
        e.preventDefault();
        spaceDownTimeRef.current = Date.now();
        isPanningRef.current = false;
        if (mount) mount.style.cursor = 'grab';
        return;
      }
      if (k === 'enter' && activeHutRef.current) {
        if (moveIntervalRef.current) { clearInterval(moveIntervalRef.current); moveIntervalRef.current = null; clickMovingRef.current = false; }
        keysRef.current.clear();
        onEnterVilla?.(activeHutRef.current.villa);
      }
      if (k === 'enter' && activeNpcRef.current && !activeHutRef.current) {
        setChatNpc(activeNpcRef.current.id);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current.delete(k);
      if (k === ' ' || e.key === ' ') {
        spaceDownTimeRef.current = 0;
        isPanningRef.current = false;
        if (mount) mount.style.cursor = '';
      }
    };

    // ── Pan mode + villa hover detection ──
    let lastHoverCheck = 0;
    const _hoverRay = new THREE.Raycaster();
    const _hoverVec2 = new THREE.Vector2();
    const _hoverPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.18);
    const _hoverHit = new THREE.Vector3();

    const onMouseMove = (e: MouseEvent) => {
      if (!startedRef.current) return;
      if (spaceDownTimeRef.current > 0) {
        if (!isPanningRef.current) {
          isPanningRef.current = true;
          if (isSpinningRef.current) { isSpinningRef.current = false; setIsSpinning(false); }
          if (mount) mount.style.cursor = 'grabbing';
          // Seed lastMouseX on pan start so first delta is zero
          lastMouseXRef.current = e.clientX;
        }
        orbitAngleRef.current -= (e.clientX - lastMouseXRef.current) * 0.006;
        lastMouseXRef.current = e.clientX;
        return;
      }
      lastMouseXRef.current = e.clientX;

      if (chatNpcRef.current || teleportRef.current) return;
      const now = performance.now();
      if (now - lastHoverCheck < 33) return;
      lastHoverCheck = now;

      const rect = mount.getBoundingClientRect();
      _hoverVec2.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      _hoverRay.setFromCamera(_hoverVec2, camera);
      const scheduleHoverClear = () => {
        if (!hoveredHutRef.current || isHoveredTooltipRef.current) return;
        if (hoveredHutClearTimeoutRef.current) clearTimeout(hoveredHutClearTimeoutRef.current);
        hoveredHutClearTimeoutRef.current = setTimeout(() => {
          if (!isHoveredTooltipRef.current) { setHoveredHut(null); hoveredHutRef.current = null; }
        }, 150);
      };

      if (!_hoverRay.ray.intersectPlane(_hoverPlane, _hoverHit)) {
        scheduleHoverClear();
        return;
      }

      let bestHut: HutRef | null = null;
      let bestDist = Infinity;
      for (const hr of hutRefsRef.current) {
        const d = Math.hypot(_hoverHit.x - hr.worldX, _hoverHit.z - hr.worldZ);
        if (d < bestDist) { bestDist = d; bestHut = hr; }
      }

      if (bestDist < 2.5 && bestHut) {
        const playerDist = Math.hypot(posRef.current.x - bestHut.worldX, posRef.current.z - bestHut.worldZ);
        if (playerDist >= 2.8) {
          // Cancel any pending clear since we have a valid hover
          if (hoveredHutClearTimeoutRef.current) { clearTimeout(hoveredHutClearTimeoutRef.current); hoveredHutClearTimeoutRef.current = null; }
          const sc = projectToScreen(bestHut.worldX, bestHut.worldZ, 2.5);
          if (sc) {
            const val: ActiveHut = { villa: bestHut.villa, screenX: sc.x, screenY: sc.y, worldX: bestHut.worldX, worldZ: bestHut.worldZ };
            setHoveredHut(val);
            hoveredHutRef.current = val;
          }
        } else {
          scheduleHoverClear();
        }
      } else {
        scheduleHoverClear();
      }
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    mount.addEventListener('mousemove', onMouseMove);

    // ── Scroll zoom ──
    const onWheel = (e: WheelEvent) => {
      if (!focusedRef.current) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.5 : -0.5;
      viewSizeRef.current = Math.max(5, Math.min(18, viewSizeRef.current + delta));
      const vs = viewSizeRef.current;
      const cam = cameraRef.current;
      if (!cam) return;
      const asp = mount.clientWidth / mount.clientHeight;
      cam.left = -vs * asp; cam.right = vs * asp;
      cam.top = vs; cam.bottom = -vs;
      cam.updateProjectionMatrix();
    };
    mount.addEventListener('wheel', onWheel, { passive: false });

    // ── Outside-click defocus ──
    const onDocMouseDown = (e: MouseEvent) => {
      if (!mount.contains(e.target as Node)) {
        focusedRef.current = false;
        setFocused(false);
        keysRef.current.clear();
        isPanningRef.current = false;
        spaceDownTimeRef.current = 0;
      }
    };
    document.addEventListener('mousedown', onDocMouseDown, true);

    // ── Resize ──
    const ro = new ResizeObserver(() => {
      if (!mount) return;
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h);
      composerRef.current?.setSize(w, h);
      gtaoPassRef.current?.setSize(w, h);
      const asp = w / h;
      const vs = viewSizeRef.current;
      camera.left = -vs * asp;
      camera.right = vs * asp;
      camera.top = vs;
      camera.bottom = -vs;
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    // ── Animation loop ──
    const SPEED = 0.12;
    let walkCycle = 0;
    let glowPhase = 0;
    const _tempColor = new THREE.Color();

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const t = (frameRef.current++ * 0.016);

      // Animate water
      if (waterMatRef.current) waterMatRef.current.uniforms.uTime.value = t;

      // Drift clouds + fade when overhead
      // Island XZ radius ≈ GRID * 0.42 = 8.8 world units; fade zone 7→10
      for (const cloud of cloudRefsRef.current) {
        cloud.position.x += cloud.userData.cloudSpeed ?? 0.0012;
        if (cloud.position.x > 24) cloud.position.x = -24;
        const overDist = Math.hypot(cloud.position.x, cloud.position.z);
        const baseOp: number = cloud.userData.baseOpacity ?? 0.95;
        const targetOp = overDist < 7.0
          ? 0.18
          : overDist < 10.0
            ? 0.18 + (baseOp - 0.18) * ((overDist - 7.0) / 3.0)
            : baseOp;
        const cMat: THREE.MeshLambertMaterial = cloud.userData.cloudMat;
        if (cMat) cMat.opacity += (targetOp - cMat.opacity) * 0.04; // smooth lerp
      }

      // ── Player entrance sequence ──────────────────────────────────────────
      const player = playerRef.current;
      const phase = playerEntrancePhase.current;
      if (phase === 'waiting' && startedRef.current && !showNavRef.current && player) {
        // Trigger the drop
        playerEntrancePhase.current = 'dropping';
        playerEntranceTRef.current = t;
        player.visible = true;
      }
      if (phase === 'dropping' && player) {
        const elapsed = t - playerEntranceTRef.current;
        const dropDur = 0.55;
        const startY = 5.0, endY = 0.18;
        if (elapsed < dropDur) {
          // Cubic ease-in (gravity)
          const p = elapsed / dropDur;
          player.position.y = startY + (endY - startY) * (p * p * p);
        } else {
          player.position.y = endY;
          playerEntrancePhase.current = 'puff';
          playerEntranceTRef.current = t;
          // Activate puff particles at landing position
          for (const puff of puffParticlesRef.current) {
            puff.mesh.position.set(posRef.current.x, 0.3, posRef.current.z);
            puff.mesh.visible = true;
            (puff.mesh.material as THREE.MeshLambertMaterial).opacity = 0.85;
            puff.mesh.scale.setScalar(1);
          }
          // Show arrow
          const arr = arrowRef.current;
          if (arr) { arr.visible = true; (arr.material as THREE.MeshLambertMaterial).opacity = 1.0; }
        }
      }
      if (phase === 'puff') {
        const elapsed = t - playerEntranceTRef.current;
        const puffDur = 0.45;
        if (elapsed < puffDur) {
          const p = elapsed / puffDur;
          for (const puff of puffParticlesRef.current) {
            puff.mesh.position.x += puff.vx;
            puff.mesh.position.z += puff.vz;
            puff.mesh.position.y = 0.3 + p * 0.4;
            puff.mesh.scale.setScalar(1 + p * 1.8);
            (puff.mesh.material as THREE.MeshLambertMaterial).opacity = 0.85 * (1 - p);
          }
        } else {
          for (const puff of puffParticlesRef.current) puff.mesh.visible = false;
          playerEntrancePhase.current = 'done';
          playerEntranceTRef.current = t;
        }
      }
      // Green arrow — bob and fade out after landing (3.5s window)
      const arr = arrowRef.current;
      if (arr && arr.visible && (phase === 'done' || phase === 'puff')) {
        const elapsed = t - playerEntranceTRef.current + (phase === 'done' ? 0 : 0);
        const arrowElapsed = phase === 'done' ? elapsed : Math.max(0, t - playerEntranceTRef.current);
        arr.position.y = 1.35 + Math.sin(arrowElapsed * 4.0) * 0.14;
        const fade = arrowElapsed < 2.2 ? 1.0 : Math.max(0, 1.0 - (arrowElapsed - 2.2) / 1.3);
        (arr.material as THREE.MeshLambertMaterial).opacity = fade;
        if (fade <= 0) arr.visible = false;
      }

      // Player movement (or teleport animation)
      const keys = keysRef.current;
      const pos = posRef.current;
      const tp = teleportRef.current;

      // Skip movement while entrance animation is in progress
      if ((playerEntrancePhase.current === 'waiting' || playerEntrancePhase.current === 'dropping') && player) {
        player.position.x = pos.x;
        player.position.z = pos.z;
      }

      if (tp && player && playerEntrancePhase.current !== 'waiting' && playerEntrancePhase.current !== 'dropping') {
        tp.progress += 0.016;
        if (tp.phase === 'shrink') {
          const t2 = Math.min(tp.progress / 0.28, 1);
          const ease = 1 - (1 - t2) * (1 - t2);
          player.scale.setScalar(1 - ease * 0.85);
          player.position.y = 0.18 + ease * 0.6;
          if (t2 >= 1) { tp.phase = 'move'; tp.progress = 0; }
        } else if (tp.phase === 'move') {
          pos.x = tp.target.x;
          pos.z = tp.target.z;
          player.position.x = tp.target.x;
          player.position.z = tp.target.z;
          tp.phase = 'grow';
          tp.progress = 0;
        } else if (tp.phase === 'grow') {
          const t2 = Math.min(tp.progress / 0.32, 1);
          const ease = t2 < 0.5 ? 4 * t2 * t2 * t2 : 1 - Math.pow(-2 * t2 + 2, 3) / 2;
          player.scale.setScalar(0.15 + ease * 0.85);
          player.position.y = 0.18 + (1 - ease) * 0.6;
          if (t2 >= 1) {
            player.scale.setScalar(1);
            player.position.y = 0.18;
            const villa = tp.villa;
            teleportRef.current = null;
            onEnterVilla?.(villa);
          }
        }
      } else if (playerEntrancePhase.current === 'done' || playerEntrancePhase.current === 'puff') {
        // Orbit-relative movement: rotate input by current camera angle so
        // arrow keys always move in the direction they appear on screen.
        const θ = orbitAngleRef.current;
        const fwdX = -Math.sin(θ), fwdZ = -Math.cos(θ);
        const rgtX =  Math.cos(θ), rgtZ = -Math.sin(θ);
        let fwd = 0, rgt = 0;
        if (keys.has('arrowup')    || keys.has('w')) fwd += 1;
        if (keys.has('arrowdown') || keys.has('s'))   fwd -= 1;
        if (keys.has('arrowright') || keys.has('d')) rgt += 1;
        if (keys.has('arrowleft')  || keys.has('a')) rgt -= 1;
        const targetDx = (fwd * fwdX + rgt * rgtX) * SPEED;
        const targetDz = (fwd * fwdZ + rgt * rgtZ) * SPEED;
        const accel = (fwd !== 0 || rgt !== 0) ? 0.18 : 0.10;
        playerVelRef.current.x += (targetDx - playerVelRef.current.x) * accel;
        playerVelRef.current.z += (targetDz - playerVelRef.current.z) * accel;
        let dx = playerVelRef.current.x;
        let dz = playerVelRef.current.z;

        const moving = Math.abs(dx) + Math.abs(dz) > 0.0005;

        if (moving && player) {
          const nx = pos.x + dx, nz = pos.z + dz;
          const gx = Math.floor(nx + HALF), gz = Math.floor(nz + HALF);
          if (inIsland(gx, gz)) { pos.x = nx; pos.z = nz; }
          player.rotation.y = Math.atan2(dx, dz);
        }

        const isWalking = moving || clickMovingRef.current;
        if (isWalking) walkCycle += 0.22;
        else walkCycle = 0;

        if (player) {
          player.position.x = pos.x;
          player.position.z = pos.z;
          // children order: legL[0] legR[1] footL[2] footR[3] body[4] head[5] hair[6] eyeL[7] eyeR[8] armL[9] armR[10] handL[11] handR[12]
          const legL = player.children[0] as THREE.Mesh;
          const legR = player.children[1] as THREE.Mesh;
          const armL = player.children[9] as THREE.Mesh;
          const armR = player.children[10] as THREE.Mesh;
          if (isWalking) {
            legL.position.y = 0.14 + Math.sin(walkCycle) * 0.07;
            legR.position.y = 0.14 - Math.sin(walkCycle) * 0.07;
            armL.rotation.x =  Math.sin(walkCycle) * 0.55;
            armR.rotation.x = -Math.sin(walkCycle) * 0.55;
          } else {
            legL.position.y = 0.14;
            legR.position.y = 0.14;
            armL.rotation.x *= 0.85;
            armR.rotation.x *= 0.85;
          }
        }
      }

      if (player) {
        if (isSpinningRef.current) orbitAngleRef.current += 0.008;
        const camDist = 20;
        const camHeight = 18;
        camera.position.set(
          pos.x + Math.sin(orbitAngleRef.current) * camDist,
          camHeight,
          pos.z + Math.cos(orbitAngleRef.current) * camDist
        );
        camera.lookAt(pos.x, 0, pos.z);
      }

      // ── Time of day lighting ──
      const tod = timeOfDayRef.current;
      const _todC = _tempColor;
      if (sunRef.current) {
        todLerpColor(TOD_SUN, tod, _todC); sunRef.current.color.copy(_todC);
        sunRef.current.intensity = todLerp(TOD_SUN_INT, tod);
        todLerpVec3(TOD_SUN_POS, tod, sunRef.current.position);
      }
      if (hemiRef.current) {
        todLerpColor(TOD_HEMI_SKY, tod, _todC); hemiRef.current.color.copy(_todC);
        todLerpColor(TOD_HEMI_GND, tod, _todC); hemiRef.current.groundColor.copy(_todC);
        hemiRef.current.intensity = todLerp(TOD_HEMI_INT, tod);
      }
      if (fillRef.current) {
        todLerpColor(TOD_FILL, tod, _todC); fillRef.current.color.copy(_todC);
        fillRef.current.intensity = todLerp(TOD_FILL_INT, tod);
      }
      todLerpColor(TOD_SKY, tod, _todC);
      if (scene.fog instanceof THREE.FogExp2) scene.fog.color.copy(_todC).multiplyScalar(0.65);
      renderer.setClearColor(_todC);
      // Drive Sky object uniforms from TOD sun position and atmospheric params
      if (skyObjectRef.current && sunRef.current) {
        const su = skyObjectRef.current.material.uniforms;
        su['sunPosition'].value.copy(sunRef.current.position).normalize().multiplyScalar(100);
        su['turbidity'].value      = todLerp([7, 5, 4, 8, 12], tod);
        su['rayleigh'].value       = todLerp([1.0, 2.0, 2.5, 3.0, 4.0], tod);
        su['mieCoefficient'].value = todLerp([0.005, 0.005, 0.006, 0.010, 0.015], tod);
      }

      const wm = waterMatRef.current;
      if (wm) {
        todLerpColor(TOD_W_DEEP, tod, wm.uniforms.uDeepCol.value);
        todLerpColor(TOD_W_MID, tod, wm.uniforms.uMidCol.value);
        todLerpColor(TOD_W_SHALLOW, tod, wm.uniforms.uShallowCol.value);
        todLerpColor(TOD_W_NEAR, tod, wm.uniforms.uNearCol.value);
        // Sky reflection color tracks the sky TOD color
        todLerpColor(TOD_SKY, tod, wm.uniforms.uSkyCol.value);
      }

      // Torch flames + window glow intensity — sequential: windows first, torches second, campfire last
      const campfireInt = todLerp([0.0, 0.0, 0.00, 0.20, 1.0], tod); // campfire: mainly twilight
      const torchInt    = todLerp(TOD_TORCH_INT, tod);                // torches: mid dusk→twilight
      const windowInt   = todLerp(TOD_WINDOW_INT, tod);
      const flames = torchFlamesRef.current;
      for (let fi = 0; fi < flames.length; fi++) {
        const fMat = flames[fi].material as THREE.MeshBasicMaterial;
        const flicker = 0.8 + Math.sin(t * 8 + flames[fi].position.x * 3 + fi * 1.3) * 0.2;
        const lt = flames[fi].userData.lightType as string;
        const isCampfire = lt === 'campfire' || lt === 'campfireHalo';
        const isHalo = lt === 'torchHalo' || lt === 'campfireHalo';
        const base = isCampfire ? campfireInt : torchInt;
        fMat.opacity = isHalo ? base * 0.28 * flicker : base * flicker;
      }

      // Hut white glow rings + window warmth (every frame)
      glowPhase += 0.04;
      let nearestHut: HutRef | null = null;
      let nearestDist = Infinity;

      for (const hr of hutRefsRef.current) {
        const dist = Math.hypot(pos.x - hr.worldX, pos.z - hr.worldZ);
        if (dist < nearestDist) { nearestDist = dist; nearestHut = hr; }
        const ringOpacity = dist < 3.0 ? Math.min(0.35, (3.0 - dist) / 2.5) * (0.7 + Math.sin(glowPhase) * 0.3) : 0;
        (hr.glowRing.material as THREE.MeshBasicMaterial).opacity = ringOpacity;
        hr.glassMat.emissive.setRGB(windowInt * 0.8, windowInt * 0.5, windowInt * 0.1);
      }

      // Cave glow (every frame) + auto-entry (dusk/twilight only)
      const cr = caveRefRef.current;
      const caveUnlocked = tod >= 0.62; // dusk or later
      if (cr) {
        const caveDist = Math.hypot(pos.x - cr.worldX, pos.z - cr.worldZ);
        const glowMat = cr.glowMesh.material as THREE.MeshLambertMaterial;
        glowMat.opacity = 0.25 + Math.sin(glowPhase * 0.8) * 0.12;

        // Wisp — appears only at dusk+, bobs and pulses
        const wispTarget = caveUnlocked ? 1 : 0;
        const wispMat = cr.wispMesh.material as THREE.MeshLambertMaterial;
        if (wispTarget > 0 && !cr.wispMesh.visible) cr.wispMesh.visible = true;
        wispMat.opacity += (wispTarget * (0.72 + Math.sin(glowPhase * 1.4) * 0.22) - wispMat.opacity) * 0.04;
        cr.wispMesh.position.y = (0.28 + 1.55 - 0.28) + Math.sin(glowPhase * 1.1) * 0.12; // bob
        if (!caveUnlocked && wispMat.opacity < 0.01) cr.wispMesh.visible = false;
        // Wisp point light intensity
        cr.wispLight.intensity += (wispTarget * (0.35 + Math.sin(glowPhase * 1.4) * 0.12) - cr.wispLight.intensity) * 0.04;

        if (caveUnlocked && caveDist < 0.8 && !caveEnteredRef.current && !chatNpcRef.current && !teleportRef.current) {
          caveEnteredRef.current = true;
          if (moveIntervalRef.current) { clearInterval(moveIntervalRef.current); moveIntervalRef.current = null; clickMovingRef.current = false; }
          keysRef.current.clear();
          onEnterCave?.(CAVE_BOOK);
        }
        if (caveDist > 2.0) caveEnteredRef.current = false;
      }

      // NPCs disappear at night (dusk/twilight threshold)
      const npcVisible = tod < 0.72;
      // NPC white glow rings + proximity-fading bubble (every frame, no traverse)
      let nearestNpc: typeof npcGroupsRef.current[0] | null = null;
      let nearestNpcDist = Infinity;
      for (const npc of npcGroupsRef.current) {
        npc.group.visible = npcVisible;
        npc.glowRing.visible = npcVisible;
        if (!npcVisible) continue;
        const d = Math.hypot(pos.x - npc.wx, pos.z - npc.wz);
        if (d < nearestNpcDist) { nearestNpcDist = d; nearestNpc = npc; }
        const ringOpacity = d < 3.0 ? Math.min(0.4, (3.0 - d) / 2.0) : 0;
        (npc.glowRing.material as THREE.MeshBasicMaterial).opacity = ringOpacity;
        if (npc.bubble) {
          const bOpacity = d < 2.8 ? Math.min(0.9, (2.8 - d) / 1.2) : 0;
          (npc.bubble.material as THREE.MeshLambertMaterial).opacity = bOpacity;
          npc.bubble.position.y = 1.15 + Math.sin(t * 2.2 + (npc.wx * 3)) * 0.08;
          // Pop-in scale: 0.7→1 as opacity goes 0→0.9
          const bScale = 0.7 + bOpacity / 0.9 * 0.3;
          npc.bubble.scale.setScalar(bScale);
        }
        const w = npc.wander;
        if (w && !chatNpcRef.current) {
          if (t > w.nextMoveAt) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.8 + Math.random() * 1.8;
            w.targetX = w.homeX + Math.cos(angle) * radius;
            w.targetZ = w.homeZ + Math.sin(angle) * radius;
            w.nextMoveAt = t + 4 + Math.random() * 6;
          }
          const wdx = w.targetX - npc.group.position.x;
          const wdz = w.targetZ - npc.group.position.z;
          const wdist = Math.sqrt(wdx * wdx + wdz * wdz);
          if (wdist > 0.05) {
            const speed = 0.018;
            const wAccel = 0.06;
            w.velX = (w.velX ?? 0) + ((wdx / wdist) * speed - (w.velX ?? 0)) * wAccel;
            w.velZ = (w.velZ ?? 0) + ((wdz / wdist) * speed - (w.velZ ?? 0)) * wAccel;
            npc.group.position.x += w.velX;
            npc.group.position.z += w.velZ;
            npc.group.rotation.y = Math.atan2(wdx, wdz);
            npc.group.position.y = 0.18 + Math.abs(Math.sin(t * 4)) * 0.025;
          } else {
            w.velX = (w.velX ?? 0) * 0.85;
            w.velZ = (w.velZ ?? 0) * 0.85;
            npc.group.position.y = 0.18;
            npc.group.rotation.y += Math.sin(t * 0.8 + npc.wx) * 0.002;
          }
          npc.wx = npc.group.position.x;
          npc.wz = npc.group.position.z;
          npc.glowRing.position.x = npc.wx;
          npc.glowRing.position.z = npc.wz;
        } else if (!w) {
          npc.group.rotation.y += Math.sin(t * 0.8 + npc.wx) * 0.002;
        }
      }

      // Throttled tooltip setState (every 3rd frame to reduce React renders)
      if (frameRef.current % 3 === 0) {
        const prevHutSlug = activeHutRef.current?.villa.slug ?? null;
        const newHutSlug = (nearestDist < 2.8 && nearestHut) ? nearestHut.villa.slug : null;
        if (newHutSlug !== prevHutSlug || newHutSlug) {
          if (nearestDist < 2.8 && nearestHut) {
            const sc = projectToScreen(nearestHut.worldX, nearestHut.worldZ, 2.5);
            if (sc) setActiveHut({ villa: nearestHut.villa, screenX: sc.x, screenY: sc.y, worldX: nearestHut.worldX, worldZ: nearestHut.worldZ });
          } else if (activeHutRef.current) {
            setActiveHut(null);
          }
        }

        if (nearestNpcDist < 2.2 && nearestNpc && !activeHutRef.current) {
          const sc = projectToScreen(nearestNpc.wx, nearestNpc.wz, 1.8, 80, 110);
          if (sc) setActiveNpc({ id: nearestNpc.id, screenX: sc.x, screenY: sc.y });
        } else if (activeNpcRef.current) {
          setActiveNpc(null);
        }

        if (hoveredHutRef.current) {
          const hh = hoveredHutRef.current;
          const pDist = Math.hypot(pos.x - hh.worldX, pos.z - hh.worldZ);
          if (pDist < 2.8) {
            setHoveredHut(null);
            hoveredHutRef.current = null;
          } else {
            const sc = projectToScreen(hh.worldX, hh.worldZ, 2.5, 100, 130);
            if (sc) setHoveredHut(prev => prev ? { ...prev, screenX: sc.x, screenY: sc.y } : null);
          }
        }
      }

      if (composerRef.current) {
        composerRef.current.render();
      } else {
        renderer.render(scene, camera);
      }
    };
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      mount.removeEventListener('mousemove', onMouseMove);
      mount.removeEventListener('wheel', onWheel);
      document.removeEventListener('mousedown', onDocMouseDown, true);
      if (hoveredHutClearTimeoutRef.current) clearTimeout(hoveredHutClearTimeoutRef.current);
      ro.disconnect();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [projectToScreen, onEnterVilla]);

  // Store active hut in a ref so keydown handler can read it
  const activeHutRef = useRef<ActiveHut | null>(null);
  useEffect(() => { activeHutRef.current = activeHut; }, [activeHut]);

  const activeNpcRef = useRef<ActiveNpc | null>(null);
  useEffect(() => { activeNpcRef.current = activeNpc; }, [activeNpc]);

  const chatNpcRef = useRef<string | null>(null);
  const maviVisitCountRef = useRef(0);
  useEffect(() => { chatNpcRef.current = chatNpc; }, [chatNpc]);

  useEffect(() => { focusedRef.current = focused; }, [focused]);
  useEffect(() => { timeOfDayRef.current = timeOfDay; }, [timeOfDay]);
  useEffect(() => { showNavRef.current = showNav || showNavModal; }, [showNav, showNavModal]);

  // Click-to-move only — tooltip buttons handle enter/chat actions
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (chatNpcRef.current || teleportRef.current) return;

    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
      clickMovingRef.current = false;
    }

    const camera = cameraRef.current;
    const mount = mountRef.current;
    if (!camera || !mount) return;
    const rect = mount.getBoundingClientRect();
    const ndx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndy = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndx, ndy), camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.18);
    const target = new THREE.Vector3();
    if (!ray.ray.intersectPlane(plane, target)) return;
    const gx = Math.floor(target.x + HALF), gz = Math.floor(target.z + HALF);
    if (!inIsland(gx, gz)) return;

    const startX = posRef.current.x, startZ = posRef.current.z;
    const endX = target.x, endZ = target.z;
    const dist = Math.hypot(endX - startX, endZ - startZ);
    if (dist < 0.1) return;
    const steps = Math.ceil(dist / 0.06);
    let step = 0;
    clickMovingRef.current = true;
    if (playerRef.current) playerRef.current.rotation.y = Math.atan2(endX - startX, endZ - startZ);

    moveIntervalRef.current = setInterval(() => {
      if (step >= steps) {
        clearInterval(moveIntervalRef.current!);
        moveIntervalRef.current = null;
        clickMovingRef.current = false;
        return;
      }
      const t = step / steps;
      posRef.current.x = startX + (endX - startX) * t;
      posRef.current.z = startZ + (endZ - startZ) * t;
      step++;
    }, 16);
  }, []);

  const handleTeleport = useCallback((villa: VillaBook, worldX: number, worldZ: number) => {
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
      clickMovingRef.current = false;
    }
    teleportRef.current = {
      target: { x: worldX, z: worldZ },
      villa,
      phase: 'shrink',
      progress: 0,
    };
    setHoveredHut(null);
    hoveredHutRef.current = null;
  }, []);

  const handleCaveWalk = useCallback(() => {
    setChatNpc(null);
    const cr = caveRefRef.current;
    if (!cr) return;
    if (timeOfDayRef.current < 0.62) return; // easter egg: only accessible at dusk+
    const startX = posRef.current.x, startZ = posRef.current.z;
    const endX = cr.worldX, endZ = cr.worldZ;
    const dist = Math.hypot(endX - startX, endZ - startZ);
    if (dist < 0.3) { onEnterCave?.(CAVE_BOOK); return; }
    if (moveIntervalRef.current) { clearInterval(moveIntervalRef.current); moveIntervalRef.current = null; }
    const steps = Math.ceil(dist / 0.06);
    let step = 0;
    clickMovingRef.current = true;
    if (playerRef.current) playerRef.current.rotation.y = Math.atan2(endX - startX, endZ - startZ);
    moveIntervalRef.current = setInterval(() => {
      if (step >= steps) {
        clearInterval(moveIntervalRef.current!);
        moveIntervalRef.current = null;
        clickMovingRef.current = false;
        caveEnteredRef.current = true;
        onEnterCave?.(CAVE_BOOK);
        return;
      }
      const t = step / steps;
      posRef.current.x = startX + (endX - startX) * t;
      posRef.current.z = startZ + (endZ - startZ) * t;
      step++;
    }, 16);
  }, [onEnterCave]);

  const todLabel = timeOfDay < 0.15 ? 'Dawn' : timeOfDay < 0.38 ? 'Morning' : timeOfDay < 0.62 ? 'Afternoon' : timeOfDay < 0.85 ? 'Dusk' : 'Twilight';

  const dismissNavCard = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (navCardExiting) return;
    if (showNav && music.muted) music.toggle();
    setNavCardExiting(true);
    setTimeout(() => {
      setShowNav(false);
      setShowNavModal(false);
      setNavCardExiting(false);
      showNavRef.current = false; // signal entrance animation to begin
    }, 280);
  };

  return (
    <div
      ref={mountRef}
      className="relative w-full h-full outline-none"
      style={{ cursor: started ? ((activeHut || hoveredHut) ? 'pointer' : 'default') : 'pointer', touchAction: 'none' }}
      onClick={e => {
        if (!started && !titleCardExiting) {
          setTitleCardExiting(true);
          startedRef.current = true;
          showNavRef.current = true; // block entrance until nav card is dismissed
          setFocused(true); focusedRef.current = true;
          (e.currentTarget as HTMLElement).focus();
          setTimeout(() => {
            setStarted(true);
            setTitleCardExiting(false);
            setShowNav(true);
          }, 340);
          return;
        }
        if (showNav || showNavModal) { dismissNavCard(); return; }
        if (spaceDownTimeRef.current > 0) return;
        if (!focused) { setFocused(true); focusedRef.current = true; }
        handleClick(e);
      }}
      onTouchStart={e => {
        activeTouchesRef.current = e.touches.length;
        if (e.touches.length === 1) {
          touchOrbitStartXRef.current = e.touches[0].clientX;
          touchOrbitStartYRef.current = e.touches[0].clientY;
          touchOrbitActiveRef.current = true;
        } else if (e.touches.length === 2) {
          touchOrbitActiveRef.current = false;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          pinchStartDistRef.current = Math.sqrt(dx * dx + dy * dy);
        }
        if (!started) return;
        if (!focused) { setFocused(true); focusedRef.current = true; }
      }}
      onTouchMove={e => {
        if (!started || showNav) return;
        e.preventDefault();
        if (e.touches.length === 1 && touchOrbitActiveRef.current) {
          const dx = e.touches[0].clientX - touchOrbitStartXRef.current;
          const dy = e.touches[0].clientY - touchOrbitStartYRef.current;
          orbitAngleRef.current += dx * 0.008;
          viewSizeRef.current = Math.max(5, Math.min(18, viewSizeRef.current + dy * 0.04));
          const mount = mountRef.current;
          if (mount && cameraRef.current) {
            const asp = mount.clientWidth / mount.clientHeight;
            const vs = viewSizeRef.current;
            cameraRef.current.left = -vs * asp; cameraRef.current.right = vs * asp;
            cameraRef.current.top = vs; cameraRef.current.bottom = -vs;
            cameraRef.current.updateProjectionMatrix();
          }
          touchOrbitStartXRef.current = e.touches[0].clientX;
          touchOrbitStartYRef.current = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const delta = (pinchStartDistRef.current - dist) * 0.04;
          viewSizeRef.current = Math.max(5, Math.min(18, viewSizeRef.current + delta));
          pinchStartDistRef.current = dist;
          const mount = mountRef.current;
          if (mount && cameraRef.current) {
            const asp = mount.clientWidth / mount.clientHeight;
            const vs = viewSizeRef.current;
            cameraRef.current.left = -vs * asp; cameraRef.current.right = vs * asp;
            cameraRef.current.top = vs; cameraRef.current.bottom = -vs;
            cameraRef.current.updateProjectionMatrix();
          }
        }
      }}
      onTouchEnd={() => {
        activeTouchesRef.current = 0;
        touchOrbitActiveRef.current = false;
      }}
      tabIndex={0}
    >
      {/* Hut proximity UI — video teaser + enter prompt */}
      {activeHut && (
        <div
          className="absolute z-20 transition-all duration-200"
          style={{
            left: activeHut.screenX,
            top: activeHut.screenY,
            transform: 'translate(-50%, -100%) translateY(-8px)',
            pointerEvents: 'none',
          }}
        >
          {/* Video teaser window */}
          {activeHut.villa.teaserVideo && (
            <div className="mb-2 rounded-xl overflow-hidden shadow-2xl border border-white/20 w-48 h-28 bg-black">
              <video
                src={activeHut.villa.teaserVideo}
                autoPlay muted loop playsInline
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Villa name + enter button */}
          <div
            className="backdrop-blur-md text-white rounded-xl shadow-2xl border border-white/10 text-center overflow-hidden"
            style={{ pointerEvents: 'auto', background: 'rgba(12,10,22,0.88)', borderLeft: `3px solid ${activeHut.villa.color}` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 pt-3 pb-2">
              <p className="text-[12px] font-semibold tracking-wide leading-none text-white/95">{activeHut.villa.company}</p>
              <p className="text-[9px] text-white/40 mt-0.5 font-mono tracking-wide">{activeHut.villa.role} · {activeHut.villa.years}</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); if (moveIntervalRef.current) { clearInterval(moveIntervalRef.current); moveIntervalRef.current = null; clickMovingRef.current = false; } keysRef.current.clear(); onEnterVilla?.(activeHut.villa); }}
              className="w-full text-[9px] uppercase tracking-[0.18em] py-2 border-t border-white/8 transition-colors"
              style={{ color: activeHut.villa.color }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Enter →
            </button>
          </div>

          {/* Caret */}
          <div className="w-0 h-0 mx-auto" style={{ borderLeft:'6px solid transparent', borderRight:'6px solid transparent', borderTop:'6px solid rgba(0,0,0,0.75)' }} />
        </div>
      )}

      {/* Villa hover tooltip — mouse over any hut from distance → click to teleport */}
      {hoveredHut && !activeHut && (
        <div
          className="absolute z-20 transition-opacity duration-200"
          style={{
            left: hoveredHut.screenX,
            top: hoveredHut.screenY,
            transform: 'translate(-50%, -100%) translateY(-8px)',
            pointerEvents: 'none',
          }}
        >
          <div
            className="backdrop-blur-md text-white rounded-xl shadow-2xl border border-white/10 text-center overflow-hidden"
            style={{ pointerEvents: 'auto', background: 'rgba(12,10,22,0.82)', borderLeft: `3px solid ${hoveredHut.villa.color}` }}
            onClick={e => e.stopPropagation()}
            onMouseEnter={() => { isHoveredTooltipRef.current = true; if (hoveredHutClearTimeoutRef.current) { clearTimeout(hoveredHutClearTimeoutRef.current); hoveredHutClearTimeoutRef.current = null; } }}
            onMouseLeave={() => { isHoveredTooltipRef.current = false; }}
          >
            <div className="px-4 pt-3 pb-2">
              <p className="text-[12px] font-semibold tracking-wide leading-none text-white/90">{hoveredHut.villa.company}</p>
              <p className="text-[9px] text-white/40 mt-0.5 font-mono tracking-wide">{hoveredHut.villa.role} · {hoveredHut.villa.years}</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); handleTeleport(hoveredHut.villa, hoveredHut.worldX, hoveredHut.worldZ); }}
              className="w-full text-[9px] uppercase tracking-[0.18em] py-2 border-t border-white/8 transition-colors"
              style={{ color: hoveredHut.villa.color }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Visit →
            </button>
          </div>
          <div className="w-0 h-0 mx-auto" style={{ borderLeft:'6px solid transparent', borderRight:'6px solid transparent', borderTop:'6px solid rgba(0,0,0,0.70)' }} />
        </div>
      )}

      {/* ── Bottom-left: TOD slider (desktop) or D-pad (mobile) ── */}
      {!isTouchDevice.current && (
        <div className="absolute bottom-3 left-3 z-20">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 flex flex-col items-center gap-1">
            <input
              type="range" min="0" max="1" step="0.005"
              value={timeOfDay}
              onChange={e => setTimeOfDay(parseFloat(e.target.value))}
              className="w-28 h-1 accent-amber-400 cursor-pointer appearance-none rounded-full bg-white/15 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:shadow"
              onClick={e => e.stopPropagation()}
            />
            <span className="text-[9px] text-white/50 font-mono tracking-wide">{todLabel}</span>
          </div>
        </div>
      )}

      {/* Mobile D-pad — only on touch devices, only when playing */}
      {isTouchDevice.current && started && !showNav && (
        <div className="absolute bottom-4 left-4 z-20 select-none" onClick={e => e.stopPropagation()}>
          {/* D-pad cross */}
          <div style={{ position: 'relative', width: 120, height: 120 }}>
            {/* Center fill */}
            <div style={{ position:'absolute', top:40, left:40, width:40, height:40, background:'rgba(255,255,255,0.08)', borderRadius:6 }} />
            {/* Up */}
            <button
              style={{ position:'absolute', top:0, left:40, width:40, height:40, background:'rgba(0,0,0,0.5)', borderRadius:'8px 8px 4px 4px', border:'1px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', touchAction:'none' }}
              onTouchStart={e => { e.preventDefault(); e.stopPropagation(); keysRef.current.add('arrowup'); }}
              onTouchEnd={e => { e.preventDefault(); keysRef.current.delete('arrowup'); }}
            ><span style={{ display:'block', width:0, height:0, borderLeft:'7px solid transparent', borderRight:'7px solid transparent', borderBottom:'9px solid rgba(255,255,255,0.95)' }} /></button>
            {/* Down */}
            <button
              style={{ position:'absolute', top:80, left:40, width:40, height:40, background:'rgba(0,0,0,0.5)', borderRadius:'4px 4px 8px 8px', border:'1px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', touchAction:'none' }}
              onTouchStart={e => { e.preventDefault(); e.stopPropagation(); keysRef.current.add('arrowdown'); }}
              onTouchEnd={e => { e.preventDefault(); keysRef.current.delete('arrowdown'); }}
            ><span style={{ display:'block', width:0, height:0, borderLeft:'7px solid transparent', borderRight:'7px solid transparent', borderTop:'9px solid rgba(255,255,255,0.95)' }} /></button>
            {/* Left */}
            <button
              style={{ position:'absolute', top:40, left:0, width:40, height:40, background:'rgba(0,0,0,0.5)', borderRadius:'8px 4px 4px 8px', border:'1px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', touchAction:'none' }}
              onTouchStart={e => { e.preventDefault(); e.stopPropagation(); keysRef.current.add('arrowleft'); }}
              onTouchEnd={e => { e.preventDefault(); keysRef.current.delete('arrowleft'); }}
            ><span style={{ display:'block', width:0, height:0, borderTop:'7px solid transparent', borderBottom:'7px solid transparent', borderRight:'9px solid rgba(255,255,255,0.95)' }} /></button>
            {/* Right */}
            <button
              style={{ position:'absolute', top:40, left:80, width:40, height:40, background:'rgba(0,0,0,0.5)', borderRadius:'4px 8px 8px 4px', border:'1px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', touchAction:'none' }}
              onTouchStart={e => { e.preventDefault(); e.stopPropagation(); keysRef.current.add('arrowright'); }}
              onTouchEnd={e => { e.preventDefault(); keysRef.current.delete('arrowright'); }}
            ><span style={{ display:'block', width:0, height:0, borderTop:'7px solid transparent', borderBottom:'7px solid transparent', borderLeft:'9px solid rgba(255,255,255,0.95)' }} /></button>
          </div>
        </div>
      )}

      {/* ── Bottom-right: volume + navigation (desktop) or volume + settings (mobile) ── */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <VolumeControl {...music} />

        {isTouchDevice.current ? (
          /* Mobile: settings button that expands TOD + info */
          <div className="relative">
            {showControls && (
              <div className="absolute bottom-10 right-0 bg-black/70 backdrop-blur-md rounded-xl p-3 flex flex-col gap-3 min-w-[160px] border border-white/10 shadow-xl">
                <div className="flex flex-col items-center gap-1">
                  <input
                    type="range" min="0" max="1" step="0.005"
                    value={timeOfDay}
                    onChange={e => setTimeOfDay(parseFloat(e.target.value))}
                    className="w-full h-1 accent-amber-400 cursor-pointer appearance-none rounded-full bg-white/15 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400"
                    onClick={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                    onTouchMove={e => e.stopPropagation()}
                    onTouchEnd={e => e.stopPropagation()}
                  />
                  <span className="text-[10px] text-white/50 font-mono tracking-wide">{todLabel}</span>
                </div>
                <button
                  className="text-[10px] text-white/60 uppercase tracking-widest border border-white/15 rounded-lg py-1.5 hover:bg-white/10 transition-colors"
                  onClick={e => { e.stopPropagation(); setShowControls(false); setShowNavModal(true); }}
                >Navigation</button>
              </div>
            )}
            <button
              className="bg-black/40 backdrop-blur-sm rounded px-2.5 py-2 hover:bg-black/60 transition-colors"
              style={{ display:'flex', flexDirection:'column', gap:3, alignItems:'center', justifyContent:'center', width:34, height:34 }}
              onClick={e => { e.stopPropagation(); setShowControls(v => !v); }}
            >
              <span style={{ display:'block', width:14, height:1.5, background:'rgba(255,255,255,0.6)', borderRadius:1 }} />
              <span style={{ display:'block', width:14, height:1.5, background:'rgba(255,255,255,0.6)', borderRadius:1 }} />
              <span style={{ display:'block', width:14, height:1.5, background:'rgba(255,255,255,0.6)', borderRadius:1 }} />
            </button>
          </div>
        ) : (
          /* Desktop: navigation button */
          <button
            className={`bg-black/40 backdrop-blur-sm text-white/50 rounded px-2.5 py-1.5 text-[10px] font-mono hover:text-white/80 hover:bg-black/60 transition-all ${focused ? 'opacity-100' : 'opacity-60'}`}
            onClick={e => { e.stopPropagation(); setShowNavModal(true); }}
          >Navigation</button>
        )}
      </div>

      {/* NPC proximity prompt */}
      {activeNpc && !chatNpc && (
        <div
          className="absolute z-20 transition-all duration-200"
          style={{ left: activeNpc.screenX, top: activeNpc.screenY, transform: 'translate(-50%, -100%) translateY(-8px)', pointerEvents: 'none' }}
        >
          <div
            className="bg-[#1a1435]/85 backdrop-blur-md text-white rounded-xl shadow-xl border border-white/10 text-center overflow-hidden"
            style={{ pointerEvents: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-3 pt-2 pb-1.5">
              <p className="text-[11px] font-semibold text-white/85">
                {activeNpc.id === 'guide' ? 'Mavi the Guide' : 'Theo the Historian'}
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); if (activeNpc.id === 'guide') maviVisitCountRef.current++; setChatNpc(activeNpc.id); }}
              className="w-full text-[9px] uppercase tracking-widest text-white/50 hover:text-white/80 hover:bg-white/8 py-1.5 border-t border-white/10 transition-colors"
            >
              Chat →
            </button>
          </div>
          <div className="w-0 h-0 mx-auto" style={{ borderLeft:'5px solid transparent', borderRight:'5px solid transparent', borderTop:'5px solid rgba(26,20,53,0.85)' }} />
        </div>
      )}

      {/* NPC Chat overlay — click outside to dismiss */}
      {chatNpc && (
        <div
          className="absolute inset-0 z-30"
          style={{ pointerEvents: 'auto' }}
          onClick={e => { e.stopPropagation(); setChatNpc(null); }}
        >
          <NpcChat
            npcId={chatNpc}
            screenX={activeNpc?.screenX ?? 200}
            screenY={activeNpc?.screenY ?? 200}
            onClose={() => setChatNpc(null)}
            onCaveAction={handleCaveWalk}
            visitCount={maviVisitCountRef.current}
          />
        </div>
      )}

      {/* ── Title card (before first click) ── */}
      {(!started || titleCardExiting) && (
        <div className={`absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none select-none ${titleCardExiting ? 'island-backdrop-out' : 'island-backdrop-in'}`}
             style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.58) 100%)' }}>
          <div className={`relative px-10 py-8 text-center ${titleCardExiting ? 'island-card-exit' : 'island-card-enter'}`}
               style={{
                 background: 'radial-gradient(ellipse at 28% 22%, rgba(255,249,224,0.99) 0%, rgba(236,212,158,0.98) 52%, rgba(212,182,112,0.98) 100%)',
                 borderRadius: '3px 16px 5px 18px / 14px 3px 16px 5px',
                 boxShadow: '0 14px 60px rgba(0,0,0,0.58), inset 0 2px 0 rgba(255,255,255,0.52), inset 0 -3px 6px rgba(80,40,0,0.20), inset 5px 0 10px rgba(80,40,0,0.07), inset -5px 0 10px rgba(80,40,0,0.07)',
                 border: '2px solid rgba(140,95,30,0.52)',
                 outline: '1px solid rgba(200,160,70,0.28)',
                 outlineOffset: '4px',
                 minWidth: 'min(320px, 85vw)',
               }}>
            <ParchmentCorners />
            <AccentRule />
            <p className="text-[7.5px] font-mono uppercase tracking-[0.44em] mb-4" style={{ color: 'rgba(130,78,18,0.68)' }}>
              ✦ &nbsp;Interactive Portfolio&nbsp; ✦
            </p>
            <h1 className="mb-7"
                style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 'clamp(0.68rem,2.1vw,0.92rem)', lineHeight: 1.8, color: 'rgba(42,22,4,0.93)', textShadow: '0 1px 0 rgba(255,220,130,0.65), 0 2px 8px rgba(80,40,0,0.22)' }}>
              Experience<br />Oasis
            </h1>
            <AccentRule />
            <div className="mt-6 inline-flex items-center gap-2 bg-black/32 backdrop-blur-sm rounded-full px-5 py-2 border border-white/18 animate-pulse">
              <span className="text-[9.5px] font-mono uppercase tracking-[0.30em] text-white/82">
                Click to start
              </span>
            </div>
            <ParchmentTextures />
          </div>
          <ParchmentString />
        </div>
      )}

      {/* ── Navigation tutorial screen (after title card click) ── */}
      {(showNav || showNavModal || navCardExiting) && (
        <div
          className={`absolute inset-0 z-40 flex flex-col items-center justify-center select-none ${navCardExiting ? 'island-backdrop-out' : 'island-backdrop-in'}`}
          style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.58) 100%)', pointerEvents: 'auto' }}
          onClick={dismissNavCard}
        >
          <div
            className={`relative text-center mx-4 ${navCardExiting ? 'island-card-exit' : 'island-card-enter'}`}
            style={{
              background: 'radial-gradient(ellipse at 28% 22%, rgba(255,249,224,0.99) 0%, rgba(236,212,158,0.98) 52%, rgba(212,182,112,0.98) 100%)',
              borderRadius: '3px 16px 5px 18px / 14px 3px 16px 5px',
              boxShadow: '0 14px 60px rgba(0,0,0,0.58), inset 0 2px 0 rgba(255,255,255,0.52), inset 0 -3px 6px rgba(80,40,0,0.20), inset 5px 0 10px rgba(80,40,0,0.07), inset -5px 0 10px rgba(80,40,0,0.07)',
              border: '2px solid rgba(140,95,30,0.52)',
              outline: '1px solid rgba(200,160,70,0.28)',
              outlineOffset: '4px',
              maxWidth: 'min(440px, 90vw)',
              width: '100%',
              padding: '28px 32px 26px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <ParchmentCorners />
            <AccentRule />
            <p className="text-[7.5px] font-mono uppercase tracking-[0.44em] mb-5" style={{ color: 'rgba(130,78,18,0.68)' }}>
              ✦ &nbsp;How to Navigate&nbsp; ✦
            </p>

            {/* Desktop controls */}
            {!isTouchDevice.current && (
              <div className="flex flex-col gap-4 mt-2 mb-5">
                {[
                  {
                    keys: <><div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}><KeyCap>W</KeyCap><div style={{display:'flex',gap:2}}><KeyCap>A</KeyCap><KeyCap>S</KeyCap><KeyCap>D</KeyCap></div><p className="text-[7px] font-mono mt-0.5" style={{color:'rgba(120,85,30,0.5)'}}>or arrows</p></div></>,
                    h: 52, label: 'Move your explorer',
                  },
                  { keys: <><KeyCap wide>Space</KeyCap><span style={{fontSize:10,color:'rgba(120,85,30,0.55)',marginLeft:4}}>+ drag</span></>, h: 32, label: 'Orbit the camera' },
                  { keys: <KeyCap wide>Scroll</KeyCap>, h: 32, label: 'Zoom in / out' },
                  { keys: <KeyCap wide>Click</KeyCap>,  h: 32, label: 'Move to location · enter huts' },
                ].map(({ keys, h, label }, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div style={{ flexShrink: 0, display:'flex', alignItems:'center' }}>{keys}</div>
                    <div style={{ width:1, height:h, background:'rgba(160,120,60,0.18)', flexShrink:0 }} />
                    <p className="text-[11px] font-sans text-left leading-snug" style={{ color: 'rgba(55,32,10,0.72)' }}>{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Mobile controls */}
            {isTouchDevice.current && (
              <div className="flex flex-col gap-3.5 mt-2 mb-5">
                {[
                  { key: 'D-pad',  label: 'Use the D-pad (bottom-left) to move' },
                  { key: 'Drag',   label: 'Drag left/right to orbit · up/down to zoom' },
                  { key: 'Pinch',  label: 'Pinch to zoom in / out' },
                  { key: 'Menu',   label: 'Tap Menu (bottom-right) for settings' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <div style={{ flexShrink: 0 }}><KeyCap wide>{key}</KeyCap></div>
                    <div style={{ width:1, height:30, background:'rgba(160,120,60,0.18)', flexShrink:0 }} />
                    <p className="text-[11px] font-sans text-left leading-snug" style={{ color: 'rgba(55,32,10,0.72)' }}>{label}</p>
                  </div>
                ))}
              </div>
            )}

            <AccentRule className="mb-5" />

            <button
              className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 border border-white/20 transition-all hover:bg-black/12 active:scale-95"
              style={{ background: 'rgba(0,0,0,0.24)', backdropFilter: 'blur(6px)' }}
              onClick={dismissNavCard}
            >
              <span className="text-[9.5px] font-mono uppercase tracking-[0.30em] text-white/85">
                {showNav ? "Let's explore →" : 'Got it'}
              </span>
            </button>

            <ParchmentTextures />
          </div>
          {(showNav || showNavModal) && <ParchmentString />}
        </div>
      )}

      {/* ── Unfocused / paused state — peripheral vignette + scanlines ── */}
      {started && !focused && !activeHut && !chatNpc && (
        <div className="absolute inset-0 z-30 pointer-events-none select-none"
             style={{ boxShadow: 'inset 0 0 140px 70px rgba(0,0,0,0.72)' }}>
          {/* Scanlines */}
          <div className="absolute inset-0 opacity-30"
               style={{
                 backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.35) 2px, rgba(0,0,0,0.35) 4px)',
                 animation: 'scanlines 8s linear infinite',
               }} />
          {/* Resume pill — bottom-center */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-white/12 rounded-full px-5 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/60">
                Click to resume
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default IslandGame;
