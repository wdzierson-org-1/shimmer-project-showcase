import { useEffect, useRef } from 'react';

interface Drifter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
}

function drawSoftBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  alpha: number,
) {
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
  grad.addColorStop(0.35, `rgba(255,255,255,${alpha * 0.6})`);
  grad.addColorStop(0.7, `rgba(255,255,255,${alpha * 0.2})`);
  grad.addColorStop(1, `rgba(255,255,255,0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
}

const FooterAmbient = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio, 2);

    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const shapes: Drifter[] = [
      { x: 0.25, y: 0.45, vx: 0.008, vy: 0.005, radius: 110, phase: 0 },
      { x: 0.70, y: 0.50, vx: -0.006, vy: 0.007, radius: 85, phase: 2.2 },
      { x: 0.50, y: 0.55, vx: 0.005, vy: -0.006, radius: 70, phase: 4.5 },
    ];

    let isVisible = false;
    const observer = new IntersectionObserver(
      ([e]) => { isVisible = e.isIntersecting; },
      { threshold: 0 },
    );
    observer.observe(canvas);

    let lastFrame = 0;
    const interval = 1000 / 24;

    const animate = (now: number) => {
      frameRef.current = requestAnimationFrame(animate);
      if (!isVisible || now - lastFrame < interval) return;
      lastFrame = now;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const time = now * 0.001;

      ctx.clearRect(0, 0, w, h);

      for (const s of shapes) {
        s.x += s.vx * (1 / 24);
        s.y += s.vy * (1 / 24);
        if (s.x < 0.05 || s.x > 0.95) s.vx *= -1;
        if (s.y < 0.05 || s.y > 0.95) s.vy *= -1;

        const cx = s.x * w;
        const cy = s.y * h;
        const r = s.radius * (1 + 0.12 * Math.sin(time * 0.22 + s.phase));

        drawSoftBlob(ctx, cx, cy, r, 0.18);

        const lobe1Angle = time * 0.2 + s.phase;
        const lobe2Angle = time * 0.15 + s.phase + Math.PI * 0.7;
        const lobeOffset = r * 0.45;

        drawSoftBlob(
          ctx,
          cx + lobeOffset * Math.cos(lobe1Angle),
          cy + lobeOffset * Math.sin(lobe1Angle),
          r * 0.65,
          0.10,
        );
        drawSoftBlob(
          ctx,
          cx + lobeOffset * 0.8 * Math.cos(lobe2Angle),
          cy + lobeOffset * 0.8 * Math.sin(lobe2Angle),
          r * 0.5,
          0.08,
        );
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default FooterAmbient;
