import { useEffect, useRef } from 'react';

type Props = { mode: number; chapter: number; energy: number; paused: boolean };

/** Original parametric artwork. No downloaded assets or third-party shader code. */
export function Artwork({ mode, chapter, energy, paused }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({ chapter, energy, paused });
  state.current = { chapter, energy, paused };
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, frame = 0, time = 0, last = 0;
    let visible = true;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    });
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    const move = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.tx = (event.clientX - box.left) / width - .5;
      pointer.ty = (event.clientY - box.top) / height - .5;
    };
    const leave = () => { pointer.tx = 0; pointer.ty = 0; };
    function draw() {
      if (!ctx || !width || !height) return;
      const { chapter: ch, energy: e } = state.current;
      const motion = !reduce.matches && !state.current.paused;
      if (motion) { pointer.x += (pointer.tx - pointer.x) * .035; pointer.y += (pointer.ty - pointer.y) * .035; }
      ctx.clearRect(0, 0, width, height);
      const scale = Math.min(width, height) * (mode === 1 ? .39 : .32);
      const cx = width * .5, cy = height * .5;
      if (mode === 1) {
        // A topographic study: continuous contours respond to the material control.
        for (let j = 0; j < 64; j++) {
          ctx.beginPath();
          for (let i = 0; i <= 200; i++) {
            const a = i / 200 * Math.PI * 2;
            const ripple = Math.sin(a * (3 + ch) + time * .2) * (12 + e * .24) + Math.cos(a * 5 - time * .15) * 9;
            const r = 20 + j * 4 + ripple * (j / 64);
            const x = cx + Math.cos(a) * r * 1.15 + pointer.x * j * .6;
            const y = cy + Math.sin(a) * r * .78 + Math.cos(a * 2) * 22 + pointer.y * j * .6;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath(); ctx.strokeStyle = j % 8 === 0 ? '#9c351f' : '#a9573970'; ctx.lineWidth = j % 8 === 0 ? 1.2 : .65; ctx.stroke();
        }
        return;
      }
      const points: { x: number; y: number; z: number; size: number }[] = [];
      const rotation = time * .1 + pointer.x * .8;
      const tilt = -.52 + pointer.y * .7;
      for (let ring = 0; ring < 100; ring++) {
        const a = ring / 100 * Math.PI * 2;
        for (let spoke = 0; spoke < 40; spoke++) {
          const b = spoke / 40 * Math.PI * 2;
          const twist = b + a * (ch + 1) + time * .12;
          const tube = .29 + .07 * Math.sin(a * 3 + time * .4) + e * .001;
          let x = (1 + tube * Math.cos(twist)) * Math.cos(a);
          let y = (1 + tube * Math.cos(twist)) * Math.sin(a);
          let z = tube * Math.sin(twist);
          if (mode === 2) { x *= .82; y *= .82; z += Math.sin(a * 3 + b) * .15; }
          const rx = x * Math.cos(rotation) + z * Math.sin(rotation);
          z = -x * Math.sin(rotation) + z * Math.cos(rotation);
          const ry = y * Math.cos(tilt) - z * Math.sin(tilt);
          z = y * Math.sin(tilt) + z * Math.cos(tilt);
          const perspective = 3.8 / (3.8 - z);
          points.push({ x: cx + rx * scale * perspective, y: cy + ry * scale * perspective, z, size: perspective });
        }
      }
      points.sort((a, b) => a.z - b.z);
      for (const p of points) {
        const light = (p.z + 1.5) / 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.5, p.size * (mode === 2 ? 1 : 1.65)), 0, Math.PI * 2);
        ctx.fillStyle = mode === 2 ? `rgba(210,190,143,${.16 + light * .65})` : `hsl(${ch === 1 ? 15 : ch === 2 ? 95 : 155}  ${ch === 1 ? 44 : 19}% ${16 + light * 35}%)`;
        ctx.fill();
      }
    }
    function tick(now: number) {
      frame = requestAnimationFrame(tick);
      if (now - last < 32 || !visible || document.hidden) return;
      const dt = last ? Math.min(now - last, 64) : 32;
      last = now;
      if (!reduce.matches && !state.current.paused) time += dt / 1000;
      draw();
    }
    resize.observe(canvas); observer.observe(canvas);
    canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerleave', leave);
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); observer.disconnect(); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', leave); };
  }, [mode]);
  return <canvas ref={ref} className="artwork" aria-hidden="true" />;
}
