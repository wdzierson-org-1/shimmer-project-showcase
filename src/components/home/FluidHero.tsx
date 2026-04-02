import { useEffect, useRef } from 'react';

class AABB {
  min: number[];
  max: number[];
  constructor(min: number[], max: number[]) {
    this.min = min;
    this.max = max;
  }
  computeVolume() {
    return (
      (this.max[0] - this.min[0]) *
      (this.max[1] - this.min[1]) *
      (this.max[2] - this.min[2])
    );
  }
  randomPoint(): number[] {
    return [
      this.min[0] + Math.random() * (this.max[0] - this.min[0]),
      this.min[1] + Math.random() * (this.max[1] - this.min[1]),
      this.min[2] + Math.random() * (this.max[2] - this.min[2]),
    ];
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function loadSequential(srcs: string[]) {
  for (const src of srcs) await loadScript(src);
}

function buildPositions(boxes: AABB[], count: number): number[][] {
  const totalVol = boxes.reduce((s, b) => s + b.computeVolume(), 0);
  const out: number[][] = [];
  let created = 0;
  boxes.forEach((box, i) => {
    const n =
      i < boxes.length - 1
        ? Math.floor(count * (box.computeVolume() / totalVol))
        : count - created;
    for (let j = 0; j < n; j++) out.push(box.randomPoint());
    created += n;
  });
  return out;
}

// ---- globals from loaded scripts ----
declare const WrappedGL: new (c: HTMLCanvasElement) => unknown;
declare const Utilities: {
  makePerspectiveMatrix(out: Float32Array, fov: number, aspect: number, near: number, far: number): Float32Array;
  makeLookAtMatrix(out: Float32Array, eye: number[], target: number[], up: number[]): void;
};
declare const SimulatorRenderer: new (
  canvas: HTMLCanvasElement,
  wgl: unknown,
  proj: Float32Array,
  camera: unknown,
  grid: number[],
  onLoaded: () => void
) => {
  reset(pw: number, ph: number, pos: number[][], gs: number[], gr: number[], pd: number, sr: number): void;
  update(dt: number): void;
  onMouseMove(e: MouseEvent): void;
  onMouseDown(e: MouseEvent): void;
  onMouseUp(e: MouseEvent): void;
  onResize(): void;
  simulator: { flipness: number };
};

// Grid constants — height and depth are fixed; width matches canvas aspect so
// the left/right walls land exactly at the canvas edges.
const GRID_HEIGHT = 20;
const GRID_DEPTH = 5;        // shallow: front-facing view reads as 2D
const PARTICLES_PER_CELL = 10;
const FOV = Math.PI / 3;     // 60°
const TAN_HALF_FOV = Math.tan(FOV / 2); // ≈ 0.577

export default function FluidHero() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    let animId = 0;
    let destroyed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let simRenderer: any = null;
    let projMatrix: Float32Array;

    // Size canvas to container
    let W = wrapper.clientWidth || window.innerWidth;
    let H = wrapper.clientHeight || 520;
    canvas.width = W;
    canvas.height = H;

    const SCRIPTS = [
      '/fluid/utilities.js',
      '/fluid/wrappedgl.js',
      '/fluid/camera.js',
      '/fluid/simulator.js',
      '/fluid/renderer.js',
      '/fluid/simulatorrenderer.js',
    ];

    loadSequential(SCRIPTS).then(() => {
      if (destroyed) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wgl = new (WrappedGL as any)(canvas);
      // renderer.js uses the global `wgl` in its onResize method
      (window as unknown as Record<string, unknown>).wgl = wgl;

      // ── Dynamic grid width matches canvas aspect so walls ≈ canvas edges ──
      // At distance d (height-fitted), visible width = GRID_HEIGHT * aspect.
      // Setting GRID_WIDTH = that value makes the X walls appear at canvas edges.
      const aspect = W / H;
      const GRID_WIDTH = Math.round(GRID_HEIGHT * aspect); // e.g. 49 @ 2.46:1

      // Camera sits straight ahead looking at the XY face of the grid.
      // d chosen so the full GRID_HEIGHT fills the viewport vertically.
      const camDist = GRID_HEIGHT / (2 * TAN_HALF_FOV); // ≈ 17.3
      const eye = [GRID_WIDTH / 2, GRID_HEIGHT / 2, GRID_DEPTH / 2 + camDist];
      const target = [GRID_WIDTH / 2, GRID_HEIGHT / 2, GRID_DEPTH / 2];
      // utilities.js makeLookAtMatrix computes forward as (eye - target), so
      // cross(up, forward) flips the X axis when looking along -Z. Using [0,-1,0]
      // corrects this: X+ → right, Y+ world → top of canvas, gravity → bottom.
      const up = [0, -1, 0];

      const viewMatrix = new Float32Array(16);
      Utilities.makeLookAtMatrix(viewMatrix, eye, target, up);

      projMatrix = Utilities.makePerspectiveMatrix(
        new Float32Array(16), FOV, aspect, 0.1, 300.0
      );

      // Fixed camera object — no orbit, only fluid interaction via mouse
      const fixedCam = {
        distance: camDist,
        getViewMatrix: () => viewMatrix,
        getPosition: () => eye,
        isMouseDown: () => false,   // never suppress fluid velocity
        onMouseMove: (_e: MouseEvent) => {},
        onMouseDown: (_e: MouseEvent) => {},
        onMouseUp:   (_e: MouseEvent) => {},
        setBounds:   () => {},
      };

      simRenderer = new SimulatorRenderer(
        canvas, wgl, projMatrix, fixedCam,
        [GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH],
        () => { if (!destroyed) startSim(GRID_WIDTH); }
      );

      function startSim(gw: number) {
        // Higher density → more resolution cells → more, finer particles
        const gridCellDensity = 1.4;
        const gridCells = gw * GRID_HEIGHT * GRID_DEPTH * gridCellDensity;
        const gridResY = Math.ceil(Math.pow(gridCells / 2, 1 / 3));
        const gridResZ = Math.max(gridResY, 2);
        const gridResX = gridResY * 2;

        // Fill the full XZ extent, bottom 85% of height — leaves a thin air gap
        // at the top so there's room to slosh upwards and create splash motion.
        const boxes = [new AABB([0, 0, 0], [gw, GRID_HEIGHT * 0.85, GRID_DEPTH])];
        const frac = boxes[0].computeVolume() / (gw * GRID_HEIGHT * GRID_DEPTH);
        const desired = frac * gridResX * gridResY * gridResZ * PARTICLES_PER_CELL;

        const pWidth = 512;
        const pHeight = Math.ceil(desired / pWidth);
        const pCount = pWidth * pHeight;

        const positions = buildPositions(boxes, pCount);
        // Smaller multiplier → smaller spheres; pairs with higher density above
        const sphereRadius = 4.5 / gridResX;

        simRenderer.reset(
          pWidth, pHeight, positions,
          [gw, GRID_HEIGHT, GRID_DEPTH],
          [gridResX, gridResY, gridResZ],
          PARTICLES_PER_CELL, sphereRadius
        );

        // High flipness → more bouncy/particle-like, less viscous fluid
        simRenderer.simulator.flipness = 0.985;

        const tick = () => {
          if (destroyed) return;
          simRenderer.update(1 / 60);
          animId = requestAnimationFrame(tick);
        };
        animId = requestAnimationFrame(tick);
      }

      // Mouse moves fluid — camera never orbits
      const onMove = (e: MouseEvent) => simRenderer?.onMouseMove(e);
      const onDown = (e: MouseEvent) => simRenderer?.onMouseDown(e);
      const onUp   = (e: MouseEvent) => simRenderer?.onMouseUp(e);
      canvas.addEventListener('mousemove', onMove);
      canvas.addEventListener('mousedown', onDown);
      document.addEventListener('mouseup', onUp);

      // Resize: update projection & canvas; view stays fixed (camera is static)
      const ro = new ResizeObserver(() => {
        if (destroyed) return;
        W = wrapper.clientWidth;
        H = wrapper.clientHeight;
        canvas.width = W;
        canvas.height = H;
        Utilities.makePerspectiveMatrix(projMatrix, FOV, W / H, 0.1, 300.0);
        simRenderer?.onResize();
      });
      ro.observe(wrapper);

      return () => {
        canvas.removeEventListener('mousemove', onMove);
        canvas.removeEventListener('mousedown', onDown);
        document.removeEventListener('mouseup', onUp);
        ro.disconnect();
      };
    });

    return () => {
      destroyed = true;
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full overflow-hidden"
      style={{ height: 'clamp(520px, 68vh, 760px)', background: '#060410' }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {/* "Concept + Craft + Code" — half the previous size, in scale with page type */}
      {/* Sits between the nav labels (11px) and project titles (67px max) */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{ zIndex: 10 }}
      >
        <p
          className="font-sans"
          style={{
            fontSize: 'clamp(16px, 2.4vw, 36px)',
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            lineHeight: 1,
            color: '#ffffff',
            textAlign: 'center',
            mixBlendMode: 'overlay',
            opacity: 0.85,
          }}
        >
          Concept
          <span style={{ opacity: 0.35, margin: '0 0.4em' }}>+</span>
          Craft
          <span style={{ opacity: 0.35, margin: '0 0.4em' }}>+</span>
          Code
        </p>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-6 md:left-12 flex items-center gap-3"
        style={{ zIndex: 10 }}
      >
        <div style={{ width: 32, height: 1, background: 'rgba(255,255,255,0.2)' }} />
        <span
          className="font-sans"
          style={{
            fontSize: 9,
            fontWeight: 400,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.2)',
          }}
        >
          Scroll
        </span>
      </div>
    </div>
  );
}
