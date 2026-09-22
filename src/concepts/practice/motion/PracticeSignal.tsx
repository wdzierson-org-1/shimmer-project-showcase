import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

const MESSAGE = 'Still building.';
const CHARACTERS = '.:+x#@';
const random = (n: number) => { const x = Math.sin(n * 127.1 + 73.7) * 43758.5453; return x - Math.floor(x); };
type LetterParticle = { x: number; y: number; scatterX: number; scatterY: number; seed: number; glyph: number };

/** Particle gathering and ASCII sampling adapted from React Bits. See REACT_BITS_LICENSE.md.
 * A 2D character atlas replaces per-frame WebGL readback; the word remains real, accessible text.
 */
export default function PracticeSignal() {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<((time: number, still: boolean) => void) | null>(null);
  const elapsed = useRef(0);
  const [ready, setReady] = useState(false), [visible, setVisible] = useState(false), [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [awake, setAwake] = useState(() => !document.hidden);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .12 });
    observer.observe(element);
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(preference.matches), visibility = () => setAwake(!document.hidden);
    preference.addEventListener('change', motion); document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); preference.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const canvas = document.createElement('canvas'), mask = document.createElement('canvas'), atlas = document.createElement('canvas');
    const ctx = canvas.getContext('2d'), mc = mask.getContext('2d', { willReadFrequently: true }), ac = atlas.getContext('2d');
    if (!ctx || !mc || !ac) return;
    canvas.setAttribute('aria-hidden', 'true'); element.appendChild(canvas);
    let disposed = false, width = 1, height = 1, step = 4, last = 0, frozen = false;
    let particles: LetterParticle[] = [];
    const pointer = { x: -1000, y: -1000 }, easedPointer = { x: -1000, y: -1000 };
    const tile = 16;
    atlas.width = CHARACTERS.length * tile; atlas.height = tile * 3;
    ac.font = '600 14px monospace'; ac.textAlign = 'center'; ac.textBaseline = 'middle';
    ['#3d4b32', '#566342', '#718355'].forEach((ink, row) => {
      ac.fillStyle = ink;
      Array.from(CHARACTERS).forEach((glyph, column) => ac.fillText(glyph, column * tile + tile / 2, row * tile + tile / 2));
    });
    function draw(time: number, still: boolean) {
      if (disposed) return;
      last = time; frozen = still;
      ctx!.clearRect(0, 0, width, height);
      easedPointer.x += (pointer.x - easedPointer.x) * .08; easedPointer.y += (pointer.y - easedPointer.y) * .08;
      const phase = still ? 0 : time;
      for (const point of particles) {
        const progress = still ? 1 : Math.min(1, Math.max(0, (time - point.seed * .35) / 1.9));
        const remaining = (1 - progress) ** 3;
        let x = point.x + point.scatterX * remaining;
        let y = point.y + point.scatterY * remaining;
        // A shallow travelling fold, as if the characters sit on a pliable sheet.
        y += Math.sin(x / width * 6 + phase * .55) * Math.sin(phase * .35) * Math.min(7, width * .007);
        const dx = x - easedPointer.x, dy = y - easedPointer.y, distance = Math.hypot(dx, dy);
        if (!still && distance < 100 && distance > 0) {
          const force = (1 - distance / 100) ** 2 * 13;
          x += dx / distance * force; y += dy / distance * force;
        }
        const shimmer = Math.sin(point.x / width * 5 - phase * .55 + point.seed);
        const row = shimmer > .8 ? 2 : shimmer > .3 ? 1 : 0;
        const glyph = remaining > .05 ? Math.floor((point.seed * 100 + time * 8) % CHARACTERS.length) : point.glyph;
        ctx!.globalAlpha = .3 + .7 * progress;
        ctx!.drawImage(atlas, glyph * tile, row * tile, tile, tile, x - step * .68, y - step * .68, step * 1.36, step * 1.36);
      }
      ctx!.globalAlpha = 1;
    }
    function resize() {
      if (disposed) return;
      width = element!.clientWidth; height = element!.clientHeight;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
      mask.width = Math.round(width); mask.height = Math.round(height);
      mc!.textAlign = 'center'; mc!.textBaseline = 'middle';
      let size = Math.min(190, width * .153);
      mc!.font = `600 ${size}px Mori, sans-serif`;
      size *= Math.min(1, width * .97 / mc!.measureText(MESSAGE).width);
      mc!.font = `600 ${size}px Mori, sans-serif`; mc!.fillText(MESSAGE, width / 2, height / 2 + size * .03);
      const pixels = mc!.getImageData(0, 0, mask.width, mask.height).data;
      step = Math.max(2.2, Math.min(5, width / 245)); particles = [];
      for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
        if (pixels[(Math.floor(y) * mask.width + Math.floor(x)) * 4 + 3] < 160) continue;
        const seed = random(x * .17 + y * .23), angle = seed * Math.PI * 2;
        const spread = Math.min(80, width * .1) * (.4 + random(x + y));
        particles.push({ x, y, seed, scatterX: Math.cos(angle) * spread, scatterY: Math.sin(angle) * spread,
          glyph: 2 + Math.floor(random(x * 2 + y) * (CHARACTERS.length - 2)) });
      }
      draw(last, frozen);
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const rect = element.getBoundingClientRect(); pointer.x = event.clientX - rect.left; pointer.y = event.clientY - rect.top;
    };
    const leave = () => { pointer.x = -1000; pointer.y = -1000; };
    element.addEventListener('pointermove', move); element.addEventListener('pointerleave', leave);
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    renderer.current = draw; setReady(true);
    void document.fonts.load('600 120px Mori').then(() => { if (!disposed) resize(); });
    return () => {
      disposed = true; observer.disconnect(); element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', leave);
      renderer.current = null; canvas.remove();
    };
  }, []);

  useEffect(() => {
    renderer.current?.(elapsed.current, reduced);
    if (!ready || !visible || paused || reduced || !awake) return;
    let frame = 0, previous = performance.now(), painted = 0;
    const tick = (now: number) => {
      elapsed.current += Math.min(.1, (now - previous) / 1000); previous = now;
      if (now - painted >= 1000 / 30 - 1) { renderer.current?.(elapsed.current, false); painted = now; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready, visible, paused, reduced, awake]);

  return <figure className={`practice-signal ${ready ? 'is-ready' : ''}`}>
    <div className="practice-signal-art" ref={host}><p className="practice-signal-word">{MESSAGE}</p></div>
    <figcaption><span>Conceive. Design. Build. Deploy.</span><span>25+ years. Still curious.</span></figcaption>
    {ready && !reduced && <button className="practice-signal-toggle" aria-label={paused ? 'Resume text animation' : 'Pause text animation'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={12}/> : <Pause size={12}/>}</button>}
  </figure>;
}
