import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { VILLAS, type VillaBook } from '@/lib/villaBooks';

// ─── Island constants ────────────────────────────────────────────────────────
const GRID = 21;
const HALF = GRID / 2;

// ─── Hut placement (5 villas arranged in a loose pentagon) ──────────────────
const HUT_POSITIONS: Array<{ slug: string; gx: number; gz: number }> = [
  { slug: 'google',          gx: 5,  gz: 5  },
  { slug: 'included-health', gx: 15, gz: 5  },
  { slug: 'gigwalk',         gx: 3,  gz: 12 },
  { slug: 'noodle',          gx: 17, gz: 12 },
  { slug: 'recent-projects', gx: 10, gz: 15 },
];

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
  return HUT_POSITIONS.some(h => Math.abs(h.gx - gx) <= 2 && Math.abs(h.gz - gz) <= 2);
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
  varying vec2 vUv;
  varying float vWave;

  void main() {
    vec2 uv = vUv;
    // Scrolling foam lines
    float foam = smoothstep(0.82, 0.85, sin(uv.x * 18.0 + uTime * 0.6) * 0.5 + 0.5)
               * smoothstep(0.82, 0.85, sin(uv.y * 14.0 - uTime * 0.4) * 0.5 + 0.5);
    // Base water color gradient — deeper in the center
    float depth = 1.0 - length(uv - 0.5) * 1.4;
    vec3 shallow = vec3(0.44, 0.76, 0.94);
    vec3 deep    = vec3(0.18, 0.52, 0.82);
    vec3 color   = mix(deep, shallow, clamp(depth, 0.0, 1.0));
    // Specular highlights from wave peaks
    float spec = clamp(vWave * 12.0, 0.0, 1.0);
    color = mix(color, vec3(0.85, 0.95, 1.0), spec * 0.4 + foam * 0.25);
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
    // Base
    ctx.fillStyle = '#52b252';
    ctx.fillRect(0, 0, 128, 128);
    // Dark blotches
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(40,100,40,${0.08 + Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(Math.random()*128, Math.random()*128, 6+Math.random()*8, 4+Math.random()*6, Math.random()*Math.PI, 0, Math.PI*2);
      ctx.fill();
    }
    // Light highlights
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(120,200,80,${0.05 + Math.random() * 0.1})`;
      ctx.fillRect(Math.random()*128, Math.random()*128, 3+Math.random()*5, 2+Math.random()*3);
    }
    // Blade strokes
    for (let i = 0; i < 30; i++) {
      const x = Math.random()*128, y = Math.random()*128;
      ctx.strokeStyle = `rgba(30,90,30,0.3)`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y+5); ctx.lineTo(x+2, y); ctx.stroke();
    }
  });
}

function sandTex() {
  return makeTex(ctx => {
    ctx.fillStyle = '#f0c878';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 200; i++) {
      const v = 0.85 + Math.random() * 0.25;
      ctx.fillStyle = `rgba(${Math.floor(200*v)},${Math.floor(160*v)},${Math.floor(80*v)},0.35)`;
      ctx.beginPath();
      ctx.ellipse(Math.random()*128, Math.random()*128, 1+Math.random()*3, 1+Math.random()*2, Math.random()*Math.PI, 0, Math.PI*2);
      ctx.fill();
    }
  });
}

function pathTex() {
  return makeTex(ctx => {
    ctx.fillStyle = '#c8a86c';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(160,130,80,0.3)`;
      ctx.beginPath();
      ctx.ellipse(Math.random()*128, Math.random()*128, 3+Math.random()*6, 2+Math.random()*4, Math.random()*Math.PI, 0, Math.PI*2);
      ctx.fill();
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
}

function buildScene(scene: THREE.Scene): { hutRefs: HutRef[] } {
  const gTex = grassTex();
  const sTex = sandTex();
  const pTex = pathTex();
  const wTex = wallTex();

  // ── Ground tiles ──
  const tileGeos = {
    grass: new THREE.BoxGeometry(1, 0.18, 1),
    sand:  new THREE.BoxGeometry(1, 0.12, 1),
    path:  new THREE.BoxGeometry(1, 0.16, 1),
  };
  const tileMats = {
    grass: new THREE.MeshLambertMaterial({ map: gTex }),
    sand:  new THREE.MeshLambertMaterial({ map: sTex }),
    path:  new THREE.MeshLambertMaterial({ map: pTex }),
  };

  for (let gx = 0; gx < GRID; gx++) {
    for (let gz = 0; gz < GRID; gz++) {
      if (!inIsland(gx, gz)) continue;
      const sand = isSand(gx, gz);
      const path = !sand && isPath(gx, gz);
      const type = sand ? 'sand' : path ? 'path' : 'grass';
      const h = type === 'sand' ? 0.12 : type === 'path' ? 0.16 : 0.18;
      const mesh = new THREE.Mesh(tileGeos[type], tileMats[type]);
      mesh.position.set(gx - HALF + 0.5, h / 2, gz - HALF + 0.5);
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
  }

  // ── Water (large animated plane) ──
  const waterGeo = new THREE.PlaneGeometry(80, 80, 48, 48);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.ShaderMaterial({
    vertexShader: waterVertexShader,
    fragmentShader: waterFragmentShader,
    uniforms: { uTime: { value: 0 } },
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = -0.05;
  water.userData.isWater = true;
  scene.add(water);

  // ── Decorations ──
  const rng = (() => { let s = 137; return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; }; })();

  for (let gx = 1; gx < GRID - 1; gx++) {
    for (let gz = 1; gz < GRID - 1; gz++) {
      if (!inIsland(gx, gz) || isSand(gx, gz) || isPath(gx, gz)) continue;
      if (isNearHut(gx, gz)) continue;
      const r = rng();
      const wx = gx - HALF + 0.5, wz = gz - HALF + 0.5;

      if (r < 0.055) {
        // Tree: trunk + 3 foliage layers
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.14, 0.55, 7),
          new THREE.MeshLambertMaterial({ color: 0x8B6914 })
        );
        trunk.position.set(wx, 0.18 + 0.28, wz);
        trunk.castShadow = true;
        scene.add(trunk);

        const foliageLayers = [
          { y: 0.7, r: 0.72, color: 0x3a8a3a },
          { y: 0.95, r: 0.58, color: 0x4aaa4a },
          { y: 1.15, r: 0.42, color: 0x5aba5a },
        ];
        for (const fl of foliageLayers) {
          const f = new THREE.Mesh(
            new THREE.CylinderGeometry(0, fl.r, 0.52, 7),
            new THREE.MeshLambertMaterial({ color: fl.color })
          );
          f.position.set(wx + (rng()-0.5)*0.04, 0.18 + fl.y, wz + (rng()-0.5)*0.04);
          f.castShadow = true;
          scene.add(f);
        }
      } else if (r < 0.085) {
        // Flower
        const colors = [0xff6b9d, 0xffd700, 0xff8c42, 0xc77dff, 0xffffff, 0xff4757];
        const fc = colors[Math.floor(rng() * colors.length)];
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.025, 0.25, 5),
          new THREE.MeshLambertMaterial({ color: 0x3a8a3a })
        );
        stem.position.set(wx, 0.18 + 0.125, wz);
        scene.add(stem);
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 7, 7),
          new THREE.MeshLambertMaterial({ color: fc })
        );
        head.position.set(wx, 0.18 + 0.3, wz);
        scene.add(head);
      } else if (r < 0.105) {
        // Rock cluster
        const rockMat = new THREE.MeshLambertMaterial({ color: 0xa0a8a0 });
        for (let i = 0; i < 2 + Math.floor(rng() * 2); i++) {
          const s = 0.12 + rng() * 0.14;
          const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
          rock.position.set(wx + (rng()-0.5)*0.28, 0.18 + s*0.5, wz + (rng()-0.5)*0.28);
          rock.rotation.set(rng()*Math.PI, rng()*Math.PI, rng()*Math.PI);
          rock.castShadow = true;
          scene.add(rock);
        }
      }
    }
  }

  // ── Beach palm trees ──
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const r2 = GRID * 0.38 + rng() * 0.6;
    const gxf = HALF + Math.cos(angle) * r2;
    const gzf = HALF + Math.sin(angle) * r2;
    const gxi = Math.round(gxf), gzi = Math.round(gzf);
    if (!isSand(gxi, gzi)) continue;
    const wx = gxf - HALF, wz = gzf - HALF;
    const lean = (rng() - 0.5) * 0.25;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.1, 1.1, 6),
      new THREE.MeshLambertMaterial({ color: 0x9b7d45 })
    );
    trunk.position.set(wx, 0.12 + 0.55, wz);
    trunk.rotation.z = lean;
    trunk.castShadow = true;
    scene.add(trunk);

    const palmMat = new THREE.MeshLambertMaterial({ color: 0x27ae60 });
    for (let j = 0; j < 5; j++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 5), palmMat);
      leaf.position.set(
        wx + Math.cos(j * Math.PI*0.4) * 0.35,
        0.12 + 1.15,
        wz + Math.sin(j * Math.PI*0.4) * 0.35
      );
      leaf.rotation.set(-0.6, j * Math.PI*0.4, 0);
      scene.add(leaf);
    }
  }

  // ── Huts ──
  const hutRefs: HutRef[] = [];

  for (const pos of HUT_POSITIONS) {
    const villa = VILLAS.find(v => v.slug === pos.slug);
    if (!villa) continue;

    const group = new THREE.Group();
    const wx = pos.gx - HALF + 0.5;
    const wz = pos.gz - HALF + 0.5;
    const base = 0.18;
    const roofColor = new THREE.Color(villa.color);

    // Foundation
    const found = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.12, 2.2),
      new THREE.MeshLambertMaterial({ color: 0xe8d090 })
    );
    found.position.set(wx, base + 0.06, wz);
    found.receiveShadow = true;
    group.add(found);

    // Walls
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 1.0, 1.9),
      new THREE.MeshLambertMaterial({ map: wTex })
    );
    walls.position.set(wx, base + 0.12 + 0.5, wz);
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // Roof (4-sided pyramid)
    const roofGeo = new THREE.ConeGeometry(1.55, 0.85, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMat = new THREE.MeshLambertMaterial({ color: roofColor });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(wx, base + 0.12 + 1.0 + 0.425, wz);
    roof.castShadow = true;
    group.add(roof);

    // Roof trim (ring at base of roof)
    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.06, 5, 20),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(villa.color).multiplyScalar(0.7) })
    );
    trim.rotation.x = Math.PI / 2;
    trim.position.set(wx, base + 0.12 + 1.0, wz);
    group.add(trim);

    // Door
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.68, 0.06), doorMat);
    door.position.set(wx, base + 0.12 + 0.34, wz + 0.98);
    group.add(door);
    const arch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.21, 0.06, 8, 1, false, 0, Math.PI),
      doorMat
    );
    arch.rotation.z = Math.PI / 2;
    arch.rotation.y = Math.PI / 2;
    arch.position.set(wx, base + 0.12 + 0.68, wz + 0.98);
    group.add(arch);

    // Window shutters (left wall)
    const shutterMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(villa.color).multiplyScalar(0.85) });
    const winBase = base + 0.12 + 0.6;
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.38, 0.04), new THREE.MeshLambertMaterial({ color: 0xadd8e6, transparent: true, opacity: 0.75 }));
    winFrame.position.set(wx + 0.65, winBase, wz + 0.97);
    group.add(winFrame);
    const shutL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.38, 0.05), shutterMat);
    shutL.position.set(wx + 0.65 - 0.27, winBase, wz + 0.975);
    group.add(shutL);
    const shutR = shutL.clone();
    shutR.position.set(wx + 0.65 + 0.27, winBase, wz + 0.975);
    group.add(shutR);

    // Mirror window on right wall
    const winFrame2 = winFrame.clone();
    winFrame2.position.set(wx - 0.65, winBase, wz + 0.97);
    group.add(winFrame2);

    // Sign above door
    const signPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5),
      new THREE.MeshLambertMaterial({ color: 0x8B6914 })
    );
    signPost.position.set(wx + 0.75, base + 0.12 + 0.35, wz + 1.05);
    group.add(signPost);
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.28, 0.05),
      new THREE.MeshLambertMaterial({ color: 0xf5e6b4 })
    );
    signBoard.position.set(wx + 0.75, base + 0.12 + 0.65, wz + 1.05);
    group.add(signBoard);

    scene.add(group);
    hutRefs.push({
      villa, group, roofMesh: roof, gx: pos.gx, gz: pos.gz,
      worldX: wx, worldZ: wz, roofOrigColor: roofColor.clone(),
    });
  }

  return { hutRefs };
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

interface IslandGameProps {
  onEnterVilla?: (villa: VillaBook) => void;
}

const IslandGame = ({ onEnterVilla }: IslandGameProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const hutRefsRef = useRef<HutRef[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const posRef = useRef({ x: 0, z: -1 });
  const rafRef = useRef(0);
  const frameRef = useRef(0);
  const waterMatRef = useRef<THREE.ShaderMaterial | null>(null);

  const [activeHut, setActiveHut] = useState<ActiveHut | null>(null);
  const [focused, setFocused] = useState(false);

  // Project hut 3D coords → screen coords
  const projectToScreen = useCallback((wx: number, wz: number, wy: number): { x: number; y: number } | null => {
    const camera = cameraRef.current;
    const mount = mountRef.current;
    if (!camera || !mount) return null;
    const v = new THREE.Vector3(wx, wy, wz).project(camera);
    return {
      x: (v.x * 0.5 + 0.5) * mount.clientWidth,
      y: (-v.y * 0.5 + 0.5) * mount.clientHeight,
    };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x87ceeb, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
    mount.appendChild(renderer.domElement);
    const initW = mount.clientWidth || 900;
    const initH = mount.clientHeight || 500;
    renderer.setSize(initW, initH);
    rendererRef.current = renderer;

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.028);
    sceneRef.current = scene;

    // ── 3-light rig ──
    // 1. Hemisphere sky/ground ambient
    const hemi = new THREE.HemisphereLight(0xc8e8ff, 0xe8d8a0, 0.7);
    scene.add(hemi);

    // 2. Warm directional sun (main key light, casts shadows)
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.6);
    sun.position.set(10, 18, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    // 3. Cool fill from opposite side (softens shadows, adds depth)
    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.45);
    fill.position.set(-8, 10, -6);
    scene.add(fill);

    // ── Camera ──
    const aspect = initW / initH;
    const viewSize = 9;
    const camera = new THREE.OrthographicCamera(
      -viewSize * aspect, viewSize * aspect,
      viewSize, -viewSize,
      0.1, 120
    );
    camera.position.set(14, 16, 14);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // ── Build scene ──
    const { hutRefs } = buildScene(scene);
    hutRefsRef.current = hutRefs;

    // Find water material ref
    scene.traverse(obj => {
      if ((obj as THREE.Mesh).userData?.isWater) {
        waterMatRef.current = (obj as THREE.Mesh).material as THREE.ShaderMaterial;
      }
    });

    // ── Player ──
    const player = buildPlayer(scene);
    player.position.set(posRef.current.x, 0.18, posRef.current.z);
    playerRef.current = player;

    // ── Input ──
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)) {
        e.preventDefault();
        keysRef.current.add(k);
      }
      if (k === 'enter' && activeHutRef.current) {
        onEnterVilla?.(activeHutRef.current.villa);
      }
    };
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);

    // ── Resize ──
    const ro = new ResizeObserver(() => {
      if (!mount) return;
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h);
      const asp = w / h;
      camera.left = -viewSize * asp;
      camera.right = viewSize * asp;
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    // ── Animation loop ──
    const SPEED = 0.06;
    let walkCycle = 0;
    let glowPhase = 0;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const t = (frameRef.current++ * 0.016);

      // Animate water
      if (waterMatRef.current) waterMatRef.current.uniforms.uTime.value = t;

      // Player movement
      const keys = keysRef.current;
      const pos = posRef.current;
      let dx = 0, dz = 0;
      if (keys.has('arrowup')    || keys.has('w')) { dx -= SPEED; dz -= SPEED; }
      if (keys.has('arrowdown')  || keys.has('s')) { dx += SPEED; dz += SPEED; }
      if (keys.has('arrowleft')  || keys.has('a')) { dx -= SPEED; dz += SPEED; }
      if (keys.has('arrowright') || keys.has('d')) { dx += SPEED; dz -= SPEED; }

      const moving = dx !== 0 || dz !== 0;
      const player = playerRef.current;

      if (moving && player) {
        const nx = pos.x + dx, nz = pos.z + dz;
        const gx = Math.floor(nx + HALF), gz = Math.floor(nz + HALF);
        if (inIsland(gx, gz)) { pos.x = nx; pos.z = nz; }
        player.rotation.y = Math.atan2(dx, dz);
        walkCycle += 0.22;
      }

      if (player) {
        player.position.x = pos.x;
        player.position.z = pos.z;
        if (moving) {
          const legL = player.children[0] as THREE.Mesh;
          const legR = player.children[1] as THREE.Mesh;
          legL.position.y = 0.14 + Math.sin(walkCycle) * 0.07;
          legR.position.y = 0.14 - Math.sin(walkCycle) * 0.07;
        }
        camera.position.set(pos.x + 14, 16, pos.z + 14);
        camera.lookAt(pos.x, 0, pos.z);
      }

      // Hut glow + proximity detection
      glowPhase += 0.04;
      let nearestHut: HutRef | null = null;
      let nearestDist = Infinity;

      for (const hr of hutRefsRef.current) {
        const dist = Math.hypot(pos.x - hr.worldX, pos.z - hr.worldZ);
        if (dist < nearestDist) { nearestDist = dist; nearestHut = hr; }

        // Glow if close
        const glowing = dist < 2.8;
        const pulse = glowing ? 0.5 + Math.sin(glowPhase) * 0.5 : 0;
        const mat = hr.roofMesh.material as THREE.MeshLambertMaterial;
        mat.emissive = hr.roofOrigColor.clone().multiplyScalar(pulse * 0.35);
      }

      // Update active hut tooltip
      if (nearestDist < 2.8 && nearestHut) {
        const sc = projectToScreen(nearestHut.worldX, nearestHut.worldZ, 2.5);
        if (sc) {
          setActiveHut({ villa: nearestHut.villa, screenX: sc.x, screenY: sc.y, worldX: nearestHut.worldX, worldZ: nearestHut.worldZ });
        }
      } else {
        setActiveHut(null);
      }

      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      ro.disconnect();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [projectToScreen, onEnterVilla]);

  // Store active hut in a ref so keydown handler can read it
  const activeHutRef = useRef<ActiveHut | null>(null);
  useEffect(() => { activeHutRef.current = activeHut; }, [activeHut]);

  // Click-to-move
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // If clicking on the enter prompt, trigger villa
    if (activeHut && onEnterVilla) {
      onEnterVilla(activeHut.villa);
      return;
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
    const steps = Math.ceil(Math.hypot(endX - startX, endZ - startZ) / 0.06);
    let step = 0;
    const iv = setInterval(() => {
      if (step >= steps) { clearInterval(iv); return; }
      const t = step / steps;
      posRef.current.x = startX + (endX - startX) * t;
      posRef.current.z = startZ + (endZ - startZ) * t;
      if (playerRef.current) playerRef.current.rotation.y = Math.atan2(endX - startX, endZ - startZ);
      step++;
    }, 16);
  }, [activeHut, onEnterVilla]);

  return (
    <div
      ref={mountRef}
      className="relative w-full h-full outline-none"
      style={{ cursor: activeHut ? 'pointer' : 'default' }}
      onClick={handleClick}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      tabIndex={0}
    >
      {/* Hut proximity UI — video teaser + enter prompt */}
      {activeHut && (
        <div
          className="absolute z-20 pointer-events-none transition-all duration-200"
          style={{
            left: activeHut.screenX,
            top: activeHut.screenY,
            transform: 'translate(-50%, -100%) translateY(-8px)',
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

          {/* Villa name + enter prompt */}
          <div className="bg-black/75 backdrop-blur-md text-white rounded-xl px-3.5 py-2.5 shadow-xl border border-white/10 text-center">
            <p className="text-[12px] font-semibold tracking-wide leading-none">{activeHut.villa.company}</p>
            <p className="text-[10px] text-white/50 mt-0.5">{activeHut.villa.role} · {activeHut.villa.years}</p>
            <p className="mt-1.5 text-[10px] text-white/40 uppercase tracking-widest">
              Press Enter or click to explore
            </p>
          </div>

          {/* Caret */}
          <div className="w-0 h-0 mx-auto" style={{ borderLeft:'6px solid transparent', borderRight:'6px solid transparent', borderTop:'6px solid rgba(0,0,0,0.75)' }} />
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-3 right-3 z-20">
        <div className={`bg-black/40 backdrop-blur-sm text-white/45 rounded px-2.5 py-1.5 text-[10px] font-mono transition-opacity duration-300 ${focused ? 'opacity-100' : 'opacity-60'}`}>
          WASD · Arrows · Click to move
        </div>
      </div>

      {/* Unfocused hint */}
      {!focused && !activeHut && (
        <div className="absolute inset-0 flex items-end justify-center pb-10 z-10 pointer-events-none">
          <div className="bg-black/25 backdrop-blur-sm text-white/65 rounded-xl px-4 py-2 text-[11px] font-sans tracking-wide animate-pulse">
            Click the island to start exploring
          </div>
        </div>
      )}
    </div>
  );
};

export default IslandGame;
