import { useEffect, useRef, useCallback, useState } from 'react';

// --- Constants ---
const TILE = 16;
const COLS = 26;
const ROWS = 18;
const W = COLS * TILE;
const H = ROWS * TILE;
const SPEED = 1.4;

// --- Color palette (warm, Zelda-inspired island) ---
const PAL = {
  water:      '#3b7dd8',
  waterDark:  '#2d5fa8',
  waterFoam:  '#6db3f2',
  sand:       '#e8d5a3',
  sandDark:   '#d4be85',
  grass:      '#5cb85c',
  grassDark:  '#3d8b3d',
  grassLight: '#7dd87d',
  path:       '#d2b48c',
  pathDark:   '#b89968',
  wallBase:   '#8B7355',
  wallTop:    '#a08860',
  roofA:      '#c0392b',
  roofB:      '#2980b9',
  roofC:      '#8e44ad',
  roofD:      '#e67e22',
  roofE:      '#27ae60',
  roofF:      '#d4a017',
  door:       '#4a3728',
  tree:       '#2d6b2d',
  treeTrunk:  '#8B6914',
  flower1:    '#e74c7d',
  flower2:    '#f1c40f',
  flower3:    '#e67e22',
  rock:       '#95a5a6',
  rockDark:   '#7f8c8d',
  playerBody: '#f5d6b8',
  playerHair: '#6b4423',
  playerShirt:'#3498db',
  playerPants:'#2c3e50',
  white:      '#ffffff',
};

// --- Tile types ---
const T = {
  WATER: 0, SAND: 1, GRASS: 2, PATH: 3,
  HUT_WALL: 4, HUT_ROOF: 5, HUT_DOOR: 6,
  TREE: 7, FLOWER: 8, ROCK: 9, BRIDGE: 10,
} as const;

// --- Career huts ---
interface CareerHut {
  name: string;
  role: string;
  years: string;
  roofColor: string;
  doorX: number;
  doorY: number;
}

const HUTS: CareerHut[] = [
  { name: 'Gigwalk', role: 'Design Lead', years: '2012–2014', roofColor: PAL.roofA, doorX: 5, doorY: 7 },
  { name: 'Optum', role: 'Sr. Designer', years: '2014–2016', roofColor: PAL.roofB, doorX: 12, doorY: 4 },
  { name: 'Grand Rounds', role: 'Design Lead', years: '2016–2018', roofColor: PAL.roofC, doorX: 20, doorY: 7 },
  { name: 'Google', role: 'UX Engineer', years: '2018–2020', roofColor: PAL.roofD, doorX: 8, doorY: 13 },
  { name: 'Included Health', role: 'Staff Designer', years: '2020–2024', roofColor: PAL.roofE, doorX: 17, doorY: 13 },
  { name: 'Stash', role: 'Founder', years: '2024–Now', roofColor: PAL.roofF, doorX: 13, doorY: 9 },
];

// --- Map generation ---
function buildMap(): number[][] {
  const m: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(T.WATER));

  const cx = COLS / 2, cy = ROWS / 2;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const dx = (x - cx) / (COLS * 0.42);
      const dy = (y - cy) / (ROWS * 0.42);
      const d = dx * dx + dy * dy;
      if (d < 1.0) {
        m[y][x] = d > 0.85 ? T.SAND : T.GRASS;
      }
    }
  }

  const placePath = (x0: number, y0: number, x1: number, y1: number) => {
    let x = x0, y = y0;
    while (x !== x1 || y !== y1) {
      if (m[y]?.[x] === T.GRASS || m[y]?.[x] === T.SAND) m[y][x] = T.PATH;
      if (x !== x1) x += x < x1 ? 1 : -1;
      else if (y !== y1) y += y < y1 ? 1 : -1;
    }
    if (m[y]?.[x] === T.GRASS || m[y]?.[x] === T.SAND) m[y][x] = T.PATH;
  };

  // Paths connecting the central area
  placePath(5, 9, 13, 9);
  placePath(13, 9, 20, 9);
  placePath(13, 4, 13, 14);
  placePath(5, 7, 5, 13);
  placePath(5, 13, 8, 13);
  placePath(20, 7, 20, 13);
  placePath(17, 13, 20, 13);
  placePath(8, 13, 17, 13);

  // Place huts (3x2 wall + 1-wide roof row above + door)
  for (const hut of HUTS) {
    const dx = hut.doorX, dy = hut.doorY;
    // Walls: row at doorY-1 and doorY-2
    for (let ox = -1; ox <= 1; ox++) {
      if (m[dy - 1]?.[dx + ox] !== undefined) m[dy - 1][dx + ox] = T.HUT_WALL;
      if (m[dy - 2]?.[dx + ox] !== undefined) m[dy - 2][dx + ox] = T.HUT_WALL;
    }
    // Roof: row at doorY-3
    for (let ox = -1; ox <= 1; ox++) {
      if (m[dy - 3]?.[dx + ox] !== undefined) m[dy - 3][dx + ox] = T.HUT_ROOF;
    }
    // Door
    m[dy][dx] = T.HUT_DOOR;
  }

  // Scatter decorations
  const rng = (seed: number) => {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  };
  const rand = rng(42);
  for (let y = 2; y < ROWS - 2; y++) {
    for (let x = 2; x < COLS - 2; x++) {
      if (m[y][x] !== T.GRASS) continue;
      const r = rand();
      if (r < 0.04) m[y][x] = T.TREE;
      else if (r < 0.07) m[y][x] = T.FLOWER;
      else if (r < 0.085) m[y][x] = T.ROCK;
    }
  }

  return m;
}

const MAP = buildMap();

function isWalkable(tx: number, ty: number): boolean {
  if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return false;
  const t = MAP[ty][tx];
  return t === T.GRASS || t === T.SAND || t === T.PATH || t === T.HUT_DOOR || t === T.FLOWER || t === T.BRIDGE;
}

// --- Drawing helpers ---
function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, tile: number, frame: number) {
  const px = x * TILE, py = y * TILE;

  switch (tile) {
    case T.WATER: {
      ctx.fillStyle = ((x + y + Math.floor(frame / 30)) % 3 === 0) ? PAL.waterDark : PAL.water;
      ctx.fillRect(px, py, TILE, TILE);
      if ((x + y + Math.floor(frame / 20)) % 5 === 0) {
        ctx.fillStyle = PAL.waterFoam;
        ctx.fillRect(px + 4, py + 6, 6, 2);
      }
      break;
    }
    case T.SAND:
      ctx.fillStyle = PAL.sand;
      ctx.fillRect(px, py, TILE, TILE);
      if ((x * 7 + y * 3) % 11 === 0) {
        ctx.fillStyle = PAL.sandDark;
        ctx.fillRect(px + 3, py + 5, 2, 2);
      }
      break;
    case T.GRASS:
      ctx.fillStyle = PAL.grass;
      ctx.fillRect(px, py, TILE, TILE);
      if ((x * 3 + y * 7) % 5 === 0) {
        ctx.fillStyle = PAL.grassDark;
        ctx.fillRect(px + 2, py + 10, 3, 2);
      }
      if ((x * 11 + y) % 9 === 0) {
        ctx.fillStyle = PAL.grassLight;
        ctx.fillRect(px + 8, py + 3, 2, 2);
      }
      break;
    case T.PATH:
      ctx.fillStyle = PAL.path;
      ctx.fillRect(px, py, TILE, TILE);
      if ((x + y) % 4 === 0) {
        ctx.fillStyle = PAL.pathDark;
        ctx.fillRect(px + 5, py + 5, 3, 3);
      }
      break;
    case T.HUT_WALL:
      ctx.fillStyle = PAL.grass;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = PAL.wallBase;
      ctx.fillRect(px + 1, py, TILE - 2, TILE);
      ctx.fillStyle = PAL.wallTop;
      ctx.fillRect(px + 1, py, TILE - 2, 2);
      break;
    case T.HUT_ROOF: {
      ctx.fillStyle = PAL.grass;
      ctx.fillRect(px, py, TILE, TILE);
      const hut = HUTS.find(h => Math.abs(h.doorX - x) <= 1 && h.doorY - 3 === y);
      ctx.fillStyle = hut?.roofColor ?? PAL.roofA;
      ctx.fillRect(px, py + 4, TILE, TILE - 4);
      ctx.fillRect(px + 2, py + 2, TILE - 4, 2);
      ctx.fillRect(px + 5, py, TILE - 10, 2);
      break;
    }
    case T.HUT_DOOR:
      ctx.fillStyle = PAL.path;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = PAL.door;
      ctx.fillRect(px + 5, py, 6, TILE - 2);
      ctx.fillStyle = PAL.wallBase;
      ctx.fillRect(px, py, 5, TILE);
      ctx.fillRect(px + 11, py, 5, TILE);
      break;
    case T.TREE:
      ctx.fillStyle = PAL.grass;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = PAL.treeTrunk;
      ctx.fillRect(px + 6, py + 9, 4, 7);
      ctx.fillStyle = PAL.tree;
      ctx.fillRect(px + 2, py + 1, 12, 5);
      ctx.fillRect(px + 4, py - 1, 8, 3);
      ctx.fillRect(px + 3, py + 5, 10, 4);
      break;
    case T.FLOWER: {
      ctx.fillStyle = PAL.grass;
      ctx.fillRect(px, py, TILE, TILE);
      const colors = [PAL.flower1, PAL.flower2, PAL.flower3];
      ctx.fillStyle = colors[(x * 3 + y) % 3];
      ctx.fillRect(px + 6, py + 5, 4, 4);
      ctx.fillStyle = PAL.grassDark;
      ctx.fillRect(px + 7, py + 9, 2, 4);
      break;
    }
    case T.ROCK:
      ctx.fillStyle = PAL.grass;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = PAL.rock;
      ctx.fillRect(px + 3, py + 6, 10, 7);
      ctx.fillRect(px + 5, py + 4, 6, 3);
      ctx.fillStyle = PAL.rockDark;
      ctx.fillRect(px + 3, py + 10, 10, 3);
      break;
    case T.BRIDGE:
      ctx.fillStyle = PAL.water;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = PAL.path;
      ctx.fillRect(px + 2, py, TILE - 4, TILE);
      ctx.fillStyle = PAL.pathDark;
      ctx.fillRect(px + 2, py, 2, TILE);
      ctx.fillRect(px + TILE - 4, py, 2, TILE);
      break;
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, px: number, py: number, dir: number, frame: number) {
  const bobble = Math.floor(frame / 8) % 2 === 0 ? 0 : -1;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(px + 2, py + 13, 12, 3);

  // Body
  ctx.fillStyle = PAL.playerPants;
  ctx.fillRect(px + 4, py + 11 + bobble, 8, 4);
  ctx.fillStyle = PAL.playerShirt;
  ctx.fillRect(px + 3, py + 5 + bobble, 10, 7);
  // Head
  ctx.fillStyle = PAL.playerBody;
  ctx.fillRect(px + 4, py + 1 + bobble, 8, 5);
  // Hair
  ctx.fillStyle = PAL.playerHair;
  ctx.fillRect(px + 4, py + 0 + bobble, 8, 2);
  // Eyes
  ctx.fillStyle = '#222';
  if (dir === 0) { // down
    ctx.fillRect(px + 5, py + 3 + bobble, 2, 2);
    ctx.fillRect(px + 9, py + 3 + bobble, 2, 2);
  } else if (dir === 1) { // up
    ctx.fillRect(px + 5, py + 2 + bobble, 2, 1);
    ctx.fillRect(px + 9, py + 2 + bobble, 2, 1);
  } else if (dir === 2) { // left
    ctx.fillRect(px + 4, py + 3 + bobble, 2, 2);
  } else { // right
    ctx.fillRect(px + 10, py + 3 + bobble, 2, 2);
  }
}

// --- React Component ---
interface TooltipState {
  hut: CareerHut;
  screenX: number;
  screenY: number;
}

const IslandGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const animRef = useRef(0);
  const keysRef = useRef<Set<string>>(new Set());
  const playerRef = useRef({ x: 13 * TILE + 4, y: 10 * TILE, dir: 0, moving: false });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const scaleRef = useRef(1);

  const checkHutProximity = useCallback(() => {
    const p = playerRef.current;
    const ptx = Math.floor((p.x + 8) / TILE);
    const pty = Math.floor((p.y + 8) / TILE);

    for (const hut of HUTS) {
      if (Math.abs(ptx - hut.doorX) <= 1 && Math.abs(pty - hut.doorY) <= 1) {
        const scale = scaleRef.current;
        return {
          hut,
          screenX: hut.doorX * TILE * scale,
          screenY: (hut.doorY - 3) * TILE * scale,
        };
      }
    }
    return null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    canvas.width = W;
    canvas.height = H;

    const updateScale = () => {
      const rect = container.getBoundingClientRect();
      scaleRef.current = rect.width / W;
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(container);

    const handleKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
        keysRef.current.add(key);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);

    const loop = () => {
      animRef.current = requestAnimationFrame(loop);
      frameRef.current++;

      const p = playerRef.current;
      const keys = keysRef.current;
      let dx = 0, dy = 0;

      if (keys.has('arrowup') || keys.has('w')) { dy = -SPEED; p.dir = 1; }
      if (keys.has('arrowdown') || keys.has('s')) { dy = SPEED; p.dir = 0; }
      if (keys.has('arrowleft') || keys.has('a')) { dx = -SPEED; p.dir = 2; }
      if (keys.has('arrowright') || keys.has('d')) { dx = SPEED; p.dir = 3; }

      p.moving = dx !== 0 || dy !== 0;

      if (dx !== 0 || dy !== 0) {
        const nx = p.x + dx;
        const ny = p.y + dy;
        const checkX = dx > 0 ? nx + 12 : nx + 3;
        const checkY = dy > 0 ? ny + 14 : ny + 6;
        const tx = Math.floor(checkX / TILE);
        const ty = Math.floor(checkY / TILE);
        const txMid = Math.floor((nx + 8) / TILE);
        const tyMid = Math.floor((ny + 10) / TILE);

        if (isWalkable(tx, tyMid) && isWalkable(txMid, ty) && isWalkable(tx, ty)) {
          p.x = nx;
          p.y = ny;
        } else if (dx !== 0 && isWalkable(txMid, Math.floor((p.y + 10) / TILE))) {
          p.x = nx;
        } else if (dy !== 0 && isWalkable(Math.floor((p.x + 8) / TILE), ty)) {
          p.y = ny;
        }
      }

      // Draw map
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          drawTile(ctx, x, y, MAP[y][x], frameRef.current);
        }
      }

      // Draw hut labels
      ctx.font = '5px monospace';
      ctx.textAlign = 'center';
      for (const hut of HUTS) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(hut.name, hut.doorX * TILE + 8, (hut.doorY - 3) * TILE - 2);
      }

      // Draw player
      drawPlayer(ctx, Math.round(p.x), Math.round(p.y), p.dir, p.moving ? frameRef.current : 0);

      // Check hut proximity for tooltip
      const nearby = checkHutProximity();
      setTooltip(prev => {
        if (!nearby && !prev) return prev;
        if (!nearby) return null;
        if (prev && prev.hut.name === nearby.hut.name) return prev;
        return nearby;
      });
    };

    loop();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
      ro.disconnect();
    };
  }, [checkHutProximity]);

  // Handle click-to-move
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const targetX = (e.clientX - rect.left) * scaleX - 8;
    const targetY = (e.clientY - rect.top) * scaleY - 8;

    const p = playerRef.current;
    const dx = targetX - p.x;
    const dy = targetY - p.y;

    // Set direction based on major axis
    if (Math.abs(dx) > Math.abs(dy)) {
      p.dir = dx > 0 ? 3 : 2;
    } else {
      p.dir = dy > 0 ? 0 : 1;
    }

    // Simple step-toward-click via brief key simulation
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.min(dist / SPEED, 60);
    const keys = keysRef.current;
    if (Math.abs(dx) > 4) keys.add(dx > 0 ? 'arrowright' : 'arrowleft');
    if (Math.abs(dy) > 4) keys.add(dy > 0 ? 'arrowdown' : 'arrowup');

    setTimeout(() => {
      keys.delete('arrowup');
      keys.delete('arrowdown');
      keys.delete('arrowleft');
      keys.delete('arrowright');
    }, steps * 16);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ imageRendering: 'pixelated' }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-pointer"
        style={{
          imageRendering: 'pixelated',
          display: 'block',
        }}
        tabIndex={0}
      />

      {/* Hut tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-20 transition-all duration-200"
          style={{
            left: tooltip.screenX,
            top: tooltip.screenY - 8,
            transform: 'translate(-30%, -100%)',
          }}
        >
          <div className="bg-black/80 backdrop-blur-sm text-white rounded-lg px-3 py-2 shadow-lg border border-white/10">
            <p className="text-[11px] font-bold tracking-wide">{tooltip.hut.name}</p>
            <p className="text-[9px] text-white/60 mt-0.5">{tooltip.hut.role}</p>
            <p className="text-[9px] text-white/40">{tooltip.hut.years}</p>
          </div>
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-3 right-3 z-20">
        <div className="bg-black/50 backdrop-blur-sm text-white/50 rounded px-2 py-1 text-[9px] font-mono">
          WASD / Arrows to explore
        </div>
      </div>
    </div>
  );
};

export default IslandGame;
