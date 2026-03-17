import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

// ─── Career data ────────────────────────────────────────────────────────────
interface CareerStop {
  name: string;
  role: string;
  years: string;
  color: number;   // hut roof/accent color (hex)
  gridX: number;   // tile column on the island grid
  gridZ: number;   // tile row
}

const CAREER: CareerStop[] = [
  { name: 'Gigwalk',         role: 'Design Lead',    years: '2012–2014', color: 0xe74c3c, gridX: 3,  gridZ: 4  },
  { name: 'Optum',           role: 'Sr. Designer',   years: '2014–2016', color: 0x3498db, gridX: 9,  gridZ: 3  },
  { name: 'Grand Rounds',    role: 'Design Lead',     years: '2016–2018', color: 0x9b59b6, gridX: 15, gridZ: 4  },
  { name: 'Google',          role: 'UX Engineer',    years: '2018–2020', color: 0xf39c12, gridX: 5,  gridZ: 10 },
  { name: 'Included Health', role: 'Staff Designer', years: '2020–2024', color: 0x2ecc71, gridX: 13, gridZ: 10 },
  { name: 'Stash',           role: 'Founder',        years: '2024–Now',  color: 0xf1c40f, gridX: 9,  gridZ: 7  },
];

// ─── Island layout ───────────────────────────────────────────────────────────
const GRID = 19;   // grid is 19×19 tiles
const TILE_SIZE = 1;
const WATER_LEVEL = -0.18;

function islandMask(gx: number, gz: number): boolean {
  const cx = GRID / 2, cz = GRID / 2;
  const dx = (gx - cx) / (GRID * 0.44);
  const dz = (gz - cz) / (GRID * 0.44);
  return dx * dx + dz * dz < 1.0;
}

function isSand(gx: number, gz: number): boolean {
  const cx = GRID / 2, cz = GRID / 2;
  const dx = (gx - cx) / (GRID * 0.44);
  const dz = (gz - cz) / (GRID * 0.44);
  const d = dx * dx + dz * dz;
  return d >= 0.82 && d < 1.0;
}

function isPath(gx: number, gz: number): boolean {
  const cx = Math.floor(GRID / 2);
  // Central cross paths
  if ((gx === cx || gz === cx) && islandMask(gx, gz) && !isSand(gx, gz)) return true;
  // Diagonal paths to huts
  for (const h of CAREER) {
    if (Math.abs(gx - h.gridX) + Math.abs(gz - h.gridZ) <= 1) return false;
    // path segments
    const hx = h.gridX, hz = h.gridZ;
    if (gx === hx && Math.min(hz, cx) <= gz && gz <= Math.max(hz, cx)) return true;
    if (gz === hz && Math.min(hx, cx) <= gx && gx <= Math.max(hx, cx)) return true;
  }
  return false;
}

// ─── Procedural textures ─────────────────────────────────────────────────────
function makeTexture(draw: (ctx: CanvasRenderingContext2D) => void, size = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function grassTex() {
  return makeTexture(ctx => {
    ctx.fillStyle = '#5cb85c';
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 64, y = Math.random() * 64;
      ctx.fillStyle = Math.random() > 0.5 ? '#4cae4c' : '#6cc76c';
      ctx.fillRect(x, y, 3, 3);
    }
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * 64, y = Math.random() * 64;
      ctx.strokeStyle = '#3d8b3d';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + 2, y); ctx.stroke();
    }
  });
}

function sandTex() {
  return makeTexture(ctx => {
    ctx.fillStyle = '#e8d5a3';
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * 64, y = Math.random() * 64;
      ctx.fillStyle = Math.random() > 0.5 ? '#d4be85' : '#f0e0b0';
      ctx.fillRect(x, y, 2, 2);
    }
  });
}

function pathTex() {
  return makeTexture(ctx => {
    ctx.fillStyle = '#d2b48c';
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 64, y = Math.random() * 64;
      ctx.fillStyle = '#b89968';
      ctx.beginPath();
      ctx.ellipse(x, y, 4, 3, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function waterTex() {
  return makeTexture(ctx => {
    ctx.fillStyle = '#3b7dd8';
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 8; i++) {
      const y = Math.random() * 64;
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y + 8); ctx.stroke();
    }
  }, 128);
}

function wallTex() {
  return makeTexture(ctx => {
    ctx.fillStyle = '#c9a87a';
    ctx.fillRect(0, 0, 64, 64);
    // wood plank lines
    for (let y = 0; y < 64; y += 10) {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, y, 64, 1);
    }
    for (let x = 0; x < 64; x += 16) {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(x, 0, 1, 64);
    }
  });
}

// ─── Scene builder ────────────────────────────────────────────────────────────

function buildScene(scene: THREE.Scene): { hutMeshes: Array<{ stop: CareerStop; mesh: THREE.Object3D }> } {
  const geoCache = new Map<string, THREE.BufferGeometry>();
  const geo = (w: number, h: number, d: number) => {
    const k = `${w}:${h}:${d}`;
    if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d));
    return geoCache.get(k)!;
  };

  const gTex = grassTex();
  const sTex = sandTex();
  const pTex = pathTex();
  const wTex = waterTex();
  const wallT = wallTex();

  // ── Water plane ──
  // ── Water / ocean background — extends far so no black edges ──
  const waterMat = new THREE.MeshLambertMaterial({ color: 0x5aace8 });
  const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.y = WATER_LEVEL;
  scene.add(waterMesh);

  // ── Ground tiles ──
  for (let gx = 0; gx < GRID; gx++) {
    for (let gz = 0; gz < GRID; gz++) {
      if (!islandMask(gx, gz)) continue;
      const sand = isSand(gx, gz);
      const path = !sand && isPath(gx, gz);

      const mat = new THREE.MeshLambertMaterial({
        map: path ? pTex : sand ? sTex : gTex,
      });
      const h = sand ? 0.12 : path ? 0.16 : 0.18;
      const tile = new THREE.Mesh(geo(TILE_SIZE, h, TILE_SIZE), mat);
      tile.position.set(gx - GRID / 2 + 0.5, h / 2, gz - GRID / 2 + 0.5);
      tile.receiveShadow = true;
      scene.add(tile);
    }
  }

  // ── Decorations (trees, flowers, rocks) ──
  const rng = (() => { let s = 42; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();

  for (let gx = 1; gx < GRID - 1; gx++) {
    for (let gz = 1; gz < GRID - 1; gz++) {
      if (!islandMask(gx, gz) || isSand(gx, gz) || isPath(gx, gz)) continue;
      if (CAREER.some(h => Math.abs(h.gridX - gx) < 2.5 && Math.abs(h.gridZ - gz) < 2.5)) continue;

      const r = rng();
      const wx = gx - GRID / 2 + 0.5, wz = gz - GRID / 2 + 0.5, wy = 0.18;

      if (r < 0.06) {
        // Tree: trunk + layered foliage
        const trunk = new THREE.Mesh(geo(0.22, 0.5, 0.22), new THREE.MeshLambertMaterial({ color: 0x8B6914 }));
        trunk.position.set(wx, wy + 0.25, wz);
        trunk.castShadow = true;
        scene.add(trunk);
        const foliageColors = [0x2d6b2d, 0x3d8b3d, 0x4cae4c];
        [[0, 0.8, 0, 0.6, 0.6], [0.06, 0.65, 0, 0.5, 0.5], [0.12, 0.45, 0, 0.38, 0.38]].forEach(([yo, gy, , sx, sz], i) => {
          const f = new THREE.Mesh(
            new THREE.BoxGeometry(sx * 1.6, gy * 0.5, sz * 1.6),
            new THREE.MeshLambertMaterial({ color: foliageColors[i] })
          );
          f.position.set(wx + (rng() - 0.5) * 0.05, wy + 0.5 + yo + gy * 0.25, wz + (rng() - 0.5) * 0.05);
          f.castShadow = true;
          scene.add(f);
        });
      } else if (r < 0.1) {
        // Flower
        const stemMat = new THREE.MeshLambertMaterial({ color: 0x3d8b3d });
        const stem = new THREE.Mesh(geo(0.06, 0.22, 0.06), stemMat);
        stem.position.set(wx, wy + 0.11, wz);
        scene.add(stem);
        const flowerColors = [0xe74c7d, 0xf1c40f, 0xe67e22, 0x9b59b6, 0xffffff];
        const fc = flowerColors[Math.floor(rng() * flowerColors.length)];
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshLambertMaterial({ color: fc }));
        head.position.set(wx, wy + 0.3, wz);
        scene.add(head);
      } else if (r < 0.125) {
        // Rock cluster
        const rockMat = new THREE.MeshLambertMaterial({ color: 0x95a5a6 });
        [[0, 0.12], [0.15, 0.09], [-0.12, 0.08]].forEach(([ox, rh]) => {
          const rock = new THREE.Mesh(
            new THREE.BoxGeometry(0.22 + rng() * 0.1, rh * 2, 0.2 + rng() * 0.1),
            rockMat
          );
          rock.position.set(wx + ox, wy + rh, wz + (rng() - 0.5) * 0.15);
          rock.rotation.y = rng() * Math.PI;
          rock.castShadow = true;
          scene.add(rock);
        });
      }
    }
  }

  // ── Huts ──
  const hutMeshes: Array<{ stop: CareerStop; mesh: THREE.Object3D }> = [];

  for (const stop of CAREER) {
    const group = new THREE.Group();
    const wx = stop.gridX - GRID / 2 + 0.5;
    const wz = stop.gridZ - GRID / 2 + 0.5;
    const base = 0.18;

    // Foundation/platform
    const foundMat = new THREE.MeshLambertMaterial({ color: 0xd4be85 });
    const found = new THREE.Mesh(geo(1.9, 0.1, 1.9), foundMat);
    found.position.set(wx, base + 0.05, wz);
    found.receiveShadow = true;
    group.add(found);

    // Walls
    const wallMat = new THREE.MeshLambertMaterial({ map: wallT });
    const walls = new THREE.Mesh(geo(1.7, 0.9, 1.7), wallMat);
    walls.position.set(wx, base + 0.1 + 0.45, wz);
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // Roof (pyramid approximation using tapered box)
    const roofMat = new THREE.MeshLambertMaterial({ color: stop.color });
    const roofGeo = new THREE.CylinderGeometry(0, 1.1, 0.7, 4, 1);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(wx, base + 0.1 + 0.9 + 0.35, wz);
    roof.castShadow = true;
    group.add(roof);

    // Door
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    const door = new THREE.Mesh(geo(0.35, 0.55, 0.05), doorMat);
    door.position.set(wx, base + 0.1 + 0.28, wz + 0.88);
    group.add(door);

    // Door frame
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
    const frameTop = new THREE.Mesh(geo(0.45, 0.06, 0.05), frameMat);
    frameTop.position.set(wx, base + 0.1 + 0.58, wz + 0.88);
    group.add(frameTop);

    // Window
    const winMat = new THREE.MeshLambertMaterial({ color: 0xadd8e6, transparent: true, opacity: 0.7 });
    const win = new THREE.Mesh(geo(0.28, 0.25, 0.04), winMat);
    win.position.set(wx + 0.5, base + 0.1 + 0.5, wz + 0.87);
    group.add(win);
    const winR = win.clone();
    winR.position.set(wx - 0.5, base + 0.1 + 0.5, wz + 0.87);
    group.add(winR);

    // Small sign post
    const signPost = new THREE.Mesh(geo(0.05, 0.45, 0.05), new THREE.MeshLambertMaterial({ color: 0x8B6914 }));
    signPost.position.set(wx + 0.6, base + 0.32, wz + 1.1);
    group.add(signPost);
    const signBoard = new THREE.Mesh(geo(0.5, 0.22, 0.04), new THREE.MeshLambertMaterial({ color: 0xf5deb3 }));
    signBoard.position.set(wx + 0.6, base + 0.58, wz + 1.1);
    group.add(signBoard);

    scene.add(group);
    hutMeshes.push({ stop, mesh: group });
  }

  // ── Beach decorations ──
  for (let i = 0; i < 18; i++) {
    const rng2 = Math.random;
    const angle = (i / 18) * Math.PI * 2;
    const r = GRID * 0.38 + rng2() * 0.5;
    const gx = GRID / 2 + Math.cos(angle) * r;
    const gz = GRID / 2 + Math.sin(angle) * r;
    if (!isSand(Math.round(gx), Math.round(gz))) continue;
    const wx = gx - GRID / 2, wz = gz - GRID / 2;

    if (i % 3 === 0) {
      // Palm tree
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.08, 0.9, 6),
        new THREE.MeshLambertMaterial({ color: 0x8B7355 })
      );
      trunk.position.set(wx, 0.18 + 0.45, wz);
      trunk.rotation.z = (rng2() - 0.5) * 0.3;
      scene.add(trunk);
      const palm = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 6, 4),
        new THREE.MeshLambertMaterial({ color: 0x27ae60 })
      );
      palm.position.set(wx + (rng2() - 0.5) * 0.15, 0.18 + 0.95, wz + (rng2() - 0.5) * 0.15);
      palm.scale.set(1, 0.5, 1);
      scene.add(palm);
    }
  }

  return { hutMeshes };
}

// ─── React component ──────────────────────────────────────────────────────────

interface Tooltip {
  stop: CareerStop;
  x: number;
  y: number;
}

const IslandGame = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const posRef = useRef({ x: 0, z: 0 });
  const frameRef = useRef(0);
  const rafRef = useRef(0);
  const hutMeshesRef = useRef<Array<{ stop: CareerStop; mesh: THREE.Object3D }>>([]);

  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [focused, setFocused] = useState(false);

  // Build player character
  const buildPlayer = useCallback((scene: THREE.Scene) => {
    const g = new THREE.Group();

    // Legs
    const legMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 0.12), legMat);
    legL.position.set(-0.07, 0.13, 0);
    g.add(legL);
    const legR = legL.clone();
    legR.position.set(0.07, 0.13, 0);
    g.add(legR);

    // Body
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3498db });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.2), bodyMat);
    body.position.set(0, 0.38, 0);
    g.add(body);

    // Head
    const headMat = new THREE.MeshLambertMaterial({ color: 0xf5d6b8 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.25), headMat);
    head.position.set(0, 0.65, 0);
    g.add(head);

    // Hair
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x5d3a1a });
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.27), hairMat);
    hair.position.set(0, 0.77, 0);
    g.add(hair);

    // Eyes
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.04), eyeMat);
    eyeL.position.set(-0.07, 0.64, 0.13);
    g.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.set(0.07, 0.64, 0.13);
    g.add(eyeR);

    // Arms
    const armMat = new THREE.MeshLambertMaterial({ color: 0x3498db });
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 0.12), armMat);
    armL.position.set(-0.22, 0.38, 0);
    g.add(armL);
    const armR = armL.clone();
    armR.position.set(0.22, 0.38, 0);
    g.add(armR);

    g.traverse(m => { (m as THREE.Mesh).castShadow = true; });
    scene.add(g);
    return g;
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x7ab8f5, 1);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    mount.appendChild(renderer.domElement);

    // Size after DOM insertion so clientWidth/Height are valid
    const initW = mount.clientWidth || 800;
    const initH = mount.clientHeight || 500;
    renderer.setSize(initW, initH);
    rendererRef.current = renderer;

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x7ab8f5, 10, 20);
    sceneRef.current = scene;

    // ── Lighting ──
    const ambient = new THREE.AmbientLight(0xfff4e0, 0.65);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff8e7, 1.3);
    sun.position.set(8, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.4);
    fill.position.set(-6, 8, -4);
    scene.add(fill);

    // ── Camera ──
    const aspect = initW / initH;
    const viewSize = 7;
    const camera = new THREE.OrthographicCamera(
      -viewSize * aspect, viewSize * aspect,
      viewSize, -viewSize,
      0.1, 100
    );
    camera.position.set(10, 12, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // ── Build scene ──
    const { hutMeshes } = buildScene(scene);
    hutMeshesRef.current = hutMeshes;

    // ── Player ──
    const player = buildPlayer(scene);
    player.position.set(0, 0.18, 0);
    playerRef.current = player;
    posRef.current = { x: 0, z: 0 };

    // ── Keyboard ──
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
        e.preventDefault();
        keysRef.current.add(k);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ── Resize ──
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h);
      const aspect = w / h;
      camera.left = -viewSize * aspect;
      camera.right = viewSize * aspect;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // ── Animation loop ──
    const SPEED = 0.055;
    let walkCycle = 0;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      frameRef.current++;

      const keys = keysRef.current;
      const pos = posRef.current;
      let dx = 0, dz = 0;

      // Camera-aligned movement (isometric: WASD moves in world-space diagonals)
      if (keys.has('arrowup')    || keys.has('w')) { dx -= SPEED; dz -= SPEED; }
      if (keys.has('arrowdown')  || keys.has('s')) { dx += SPEED; dz += SPEED; }
      if (keys.has('arrowleft')  || keys.has('a')) { dx -= SPEED; dz += SPEED; }
      if (keys.has('arrowright') || keys.has('d')) { dx += SPEED; dz -= SPEED; }

      const moving = dx !== 0 || dz !== 0;

      if (moving && player) {
        const nx = pos.x + dx, nz = pos.z + dz;
        const clamp = (v: number) => Math.max(-(GRID / 2 - 1.5), Math.min(GRID / 2 - 1.5, v));
        const gx = Math.floor(nx + GRID / 2), gz = Math.floor(nz + GRID / 2);
        if (islandMask(gx, gz)) {
          pos.x = clamp(nx);
          pos.z = clamp(nz);
        }
        player.rotation.y = Math.atan2(dx, dz);
        walkCycle += 0.25;
      }

      if (player) {
        player.position.x = pos.x;
        player.position.z = pos.z;
        // Bob legs
        const legL = player.children[0] as THREE.Mesh;
        const legR = player.children[1] as THREE.Mesh;
        if (moving) {
          legL.position.y = 0.13 + Math.sin(walkCycle) * 0.06;
          legR.position.y = 0.13 - Math.sin(walkCycle) * 0.06;
        } else {
          legL.position.y = 0.13;
          legR.position.y = 0.13;
        }

        // Camera follows player with smooth offset
        camera.position.set(pos.x + 10, 12, pos.z + 10);
        camera.lookAt(pos.x, 0, pos.z);
      }

      // Hut proximity tooltip
      if (frameRef.current % 10 === 0) {
        let closest: { stop: CareerStop; dist: number } | null = null;
        for (const { stop } of hutMeshesRef.current) {
          const hx = stop.gridX - GRID / 2 + 0.5;
          const hz = stop.gridZ - GRID / 2 + 0.5;
          const dist = Math.hypot(pos.x - hx, pos.z - hz);
          if (dist < 2.2 && (!closest || dist < closest.dist)) {
            closest = { stop, dist };
          }
        }

        if (closest) {
          // Project hut position to screen
          const hx = closest.stop.gridX - GRID / 2 + 0.5;
          const hz = closest.stop.gridZ - GRID / 2 + 0.5;
          const v = new THREE.Vector3(hx, 1.8, hz);
          v.project(camera);
          const x = (v.x * 0.5 + 0.5) * mount.clientWidth;
          const y = (-v.y * 0.5 + 0.5) * mount.clientHeight;
          setTooltip({ stop: closest.stop, x, y });
        } else {
          setTooltip(null);
        }
      }

      // Animate water (slight color pulse)
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      ro.disconnect();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [buildPlayer]);

  // Click-to-move
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const mount = mountRef.current;
    const camera = cameraRef.current;
    if (!mount || !camera) return;

    const rect = mount.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.18);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, target);

    if (target) {
      const gx = Math.floor(target.x + GRID / 2);
      const gz = Math.floor(target.z + GRID / 2);
      if (islandMask(gx, gz)) {
        // Animate toward click
        const startX = posRef.current.x, startZ = posRef.current.z;
        const endX = target.x, endZ = target.z;
        const dist = Math.hypot(endX - startX, endZ - startZ);
        const steps = Math.round(dist / 0.055);
        let step = 0;

        const interval = setInterval(() => {
          if (step >= steps) { clearInterval(interval); return; }
          const t = step / steps;
          posRef.current.x = startX + (endX - startX) * t;
          posRef.current.z = startZ + (endZ - startZ) * t;
          if (playerRef.current) {
            playerRef.current.rotation.y = Math.atan2(endX - startX, endZ - startZ);
          }
          step++;
        }, 16);
      }
    }
  }, []);

  return (
    <div
      ref={mountRef}
      className="relative w-full h-full cursor-pointer outline-none"
      onClick={handleClick}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      tabIndex={0}
    >
      {/* Hut tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%) translateY(-12px)' }}
        >
          <div className="bg-black/75 backdrop-blur-md text-white rounded-xl px-3.5 py-2.5 shadow-xl border border-white/10">
            <p className="text-[12px] font-semibold tracking-wide leading-none">{tooltip.stop.name}</p>
            <p className="text-[10px] text-white/60 mt-1">{tooltip.stop.role}</p>
            <p className="text-[10px] text-white/40">{tooltip.stop.years}</p>
          </div>
          <div className="w-0 h-0 mx-auto" style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid rgba(0,0,0,0.75)' }} />
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-3 right-3 z-20">
        <div
          className={`transition-opacity duration-300 bg-black/40 backdrop-blur-sm text-white/50 rounded px-2.5 py-1.5 text-[10px] font-mono ${focused ? 'opacity-100' : 'opacity-70'}`}
        >
          WASD · Arrows · Click to explore
        </div>
      </div>

      {/* Focus hint */}
      {!focused && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-black/20 backdrop-blur-sm text-white/70 rounded-xl px-4 py-2 text-[11px] font-sans tracking-wide">
            Click to explore
          </div>
        </div>
      )}
    </div>
  );
};

export default IslandGame;
