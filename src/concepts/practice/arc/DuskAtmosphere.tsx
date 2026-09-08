import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react';

export type DuskHandle = { render: (seconds: number) => void };
type Props = { active: boolean; clocked: boolean };
const seed = (n: number) => { const v = Math.sin(n * 127.1 + 73.9) * 43758.5453; return v - Math.floor(v); };
const ridges = [
  'M0 514C155 496 243 395 398 418S675 533 817 474 1001 364 1170 432 1429 468 1600 398',
  'M0 580C167 457 262 494 402 557S639 632 822 544 1096 495 1234 552 1441 594 1600 507',
  'M0 660C184 695 307 622 451 611S713 698 886 648 1173 565 1320 616 1502 695 1600 643',
  'M0 714C218 647 344 739 534 779S828 730 1020 757 1371 794 1600 726',
];
const slopeLines = Array.from({ length: 22 }, (_, i) => {
  const y = 510 + i * 17, bend = Math.sin(i * .43) * 21;
  return `M-100 ${y}C180 ${y - 64 + bend} 310 ${y + 83} 573 ${y + 38}S921 ${y - 83 - bend} 1169 ${y - 24} 1440 ${y + 58} 1700 ${y - 20}`;
});

/** Static textured ridges, with mist and fireflies following the same clock as the story. */
const DuskAtmosphere = forwardRef<DuskHandle, Props>(function DuskAtmosphere({ active, clocked }, ref) {
  const id = useId();
  const canvas = useRef<HTMLCanvasElement>(null);
  const elapsed = useRef(4), painter = useRef<((seconds: number) => void) | null>(null);
  useImperativeHandle(ref, () => ({ render(seconds) { elapsed.current = seconds; painter.current?.(seconds); } }), []);

  useEffect(() => {
    const element = canvas.current, context = element?.getContext('2d');
    if (!element || !context) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 1, height = 1, visible = false, frame = 0, previous = 0, lastPaint = 0, lastDrawn = -Infinity;
    const sprites = ['255,230,174', '247,213,191', '224,221,248'].map(color => {
      const sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
      const ctx = sprite.getContext('2d');
      if (!ctx) return sprite;
      const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      glow.addColorStop(0, `rgba(${color},1)`); glow.addColorStop(.08, `rgba(${color},.95)`);
      glow.addColorStop(.2, `rgba(${color},.3)`); glow.addColorStop(.5, `rgba(${color},.07)`); glow.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 64, 64); return sprite;
    });
    const mist = document.createElement('canvas'); mist.width = 512; mist.height = 128;
    const mistContext = mist.getContext('2d');
    if (mistContext) {
      mistContext.scale(4, 1);
      const glow = mistContext.createRadialGradient(64, 64, 0, 64, 64, 64);
      glow.addColorStop(0, '#efccde80'); glow.addColorStop(.45, '#cfc5e145'); glow.addColorStop(1, '#cfc5e100');
      mistContext.fillStyle = glow; mistContext.fillRect(0, 0, 128, 128);
    }
    function paint(seconds: number) {
      if (!context) return;
      if (seconds > lastDrawn && seconds - lastDrawn < 1 / 30 - .001) return;
      lastDrawn = seconds;
      const time = preference.matches ? 4 : seconds;
      context.clearRect(0, 0, width, height);
      const mobile = width <= 800, count = mobile ? 62 : 118;
      // Slow sheets of mist separate the ridges. The texture itself is cached.
      for (let i = 0; i < 3; i++) {
        const x = width * (.46 + i * .18 + Math.sin(time * .027 + i * 2) * .045);
        const y = height * ((mobile ? .36 : .53) + i * (mobile ? .045 : .068));
        const mistWidth = width * (.63 + i * .12), mistHeight = height * (mobile ? .1 : .14);
        context.globalAlpha = .2 - i * .035;
        context.drawImage(mist, x - mistWidth / 2, y - mistHeight / 2, mistWidth, mistHeight);
      }
      for (let i = 0; i < count; i++) {
        const depth = seed(i + 50), phase = seed(i + 100) * Math.PI * 2;
        const x = width * (.025 + seed(i + 2) * .95) + Math.sin(time * (.09 + depth * .08) + phase) * width * .018;
        const y = height * (.14 + seed(i + 20) * .79) + Math.sin(time * .12 + phase * 2) * height * .022;
        const pulse = .18 + .82 * Math.pow(.5 + .5 * Math.sin(time * (.55 + depth * .28) + phase), 2);
        // The closest lights drift softly out of focus; keep the copy area quiet.
        const size = 8 + depth * depth * 27, copyArea = mobile ? y > height * .46 : x < width * .48;
        context.globalAlpha = pulse * (copyArea ? .32 : .76) * (.45 + depth * .55);
        context.drawImage(sprites[i % 11 === 0 ? 2 : i % 4 === 0 ? 1 : 0], x - size / 2, y - size / 2, size, size);
      }
      context.globalAlpha = 1;
    }
    painter.current = paint;
    const resize = () => {
      const rect = element.getBoundingClientRect(); width = rect.width; height = rect.height;
      if (!width || !height) return;
      const ratio = Math.min(devicePixelRatio, 1.5, 1600 / width);
      element.width = Math.round(width * ratio); element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0); lastDrawn = -Infinity; paint(elapsed.current);
    };
    const tick = (now: number) => {
      elapsed.current += previous ? Math.min((now - previous) / 1000, .1) : 0; previous = now;
      if (now - lastPaint >= 1000 / 30 - 1) { paint(elapsed.current); lastPaint = now; }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame); previous = 0;
      if (visible) paint(elapsed.current);
      if (visible && active && !clocked && !preference.matches && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(element);
    const dimensions = new ResizeObserver(resize); dimensions.observe(element); resize();
    preference.addEventListener('change', sync); document.addEventListener('visibilitychange', sync);
    return () => {
      painter.current = null; cancelAnimationFrame(frame); observer.disconnect(); dimensions.disconnect();
      preference.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync);
      sprites.forEach(sprite => { sprite.width = 0; }); mist.width = 0;
    };
  }, [active, clocked]);

  return <div className="arc-dusk" aria-hidden="true">
    <svg className="arc-dusk-landscape" viewBox="0 0 1600 900" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`${id}-sky`} x2=".2" y2="1">
          <stop stopColor="#554567"/><stop offset=".3" stopColor="#947094"/><stop offset=".57" stopColor="#e4a7ad"/><stop offset="1" stopColor="#8e83a6"/>
        </linearGradient>
        <radialGradient id={`${id}-afterglow`} cx=".76" cy=".49" r=".55">
          <stop stopColor="#f5bfbc" stopOpacity=".58"/><stop offset=".45" stopColor="#e5aec2" stopOpacity=".2"/><stop offset="1" stopColor="#eab1bf" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id={`${id}-far`} x2=".3" y2="1"><stop stopColor="#b29ab6"/><stop offset=".28" stopColor="#9689ad"/><stop offset="1" stopColor="#696a92"/></linearGradient>
        <linearGradient id={`${id}-middle`} x2=".4" y2="1"><stop stopColor="#8d81a4"/><stop offset=".35" stopColor="#716f9a"/><stop offset="1" stopColor="#46527a"/></linearGradient>
        <linearGradient id={`${id}-near`} x2="1" y2=".4"><stop stopColor="#3f405f"/><stop offset=".58" stopColor="#656083"/><stop offset="1" stopColor="#535f82"/></linearGradient>
        <linearGradient id={`${id}-foreground`} x2=".7" y2="1"><stop stopColor="#49405e"/><stop offset=".5" stopColor="#373a56"/><stop offset="1" stopColor="#242b45"/></linearGradient>
        <linearGradient id={`${id}-cloud-fade`} x2="0" y2="1"><stop stopColor="white" stopOpacity=".2"/><stop offset=".48" stopColor="white"/><stop offset="1" stopColor="white" stopOpacity="0"/></linearGradient>
        <mask id={`${id}-cloud-mask`}><path d="M0 0H1600V570H0Z" fill={`url(#${id}-cloud-fade)`}/></mask>
        <filter id={`${id}-clouds`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".002 .008" numOctaves="3" seed="17"/>
          <feColorMatrix type="matrix" values="0 0 0 0 .94 0 0 0 0 .79 0 0 0 0 .87 .85 0 0 0 -.28"/>
        </filter>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".64" numOctaves="3" stitchTiles="stitch" seed="8"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <filter id={`${id}-wash`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".006 .035" numOctaves="2" seed="23"/>
          <feColorMatrix type="matrix" values="0 0 0 0 .69 0 0 0 0 .66 0 0 0 0 .82 .85 0 0 0 -.23"/>
        </filter>
        {ridges.map((ridge, i) => <clipPath id={`${id}-ridge-${i}`} key={ridge}><path d={`${ridge}V900H0Z`}/></clipPath>)}
      </defs>
      <path fill={`url(#${id}-sky)`} d="M0 0H1600V900H0Z"/>
      <path fill={`url(#${id}-afterglow)`} d="M0 0H1600V900H0Z"/>
      <g mask={`url(#${id}-cloud-mask)`}><path d="M0 0H1600V570H0Z" filter={`url(#${id}-clouds)`} opacity=".7"/></g>
      {ridges.map((ridge, i) => <g key={ridge}>
        <path fill={`url(#${id}-${['far', 'middle', 'near', 'foreground'][i]})`} d={`${ridge}V900H0Z`}/>
        <g clipPath={`url(#${id}-ridge-${i})`}>
          <path d="M0 350H1600V900H0Z" filter={`url(#${id}-wash)`} opacity={.14 + i * .025}/>
          <g className="arc-dusk-contours" transform={`translate(${i * -31} ${i * 33})`}>
            {slopeLines.map((line, j) => <path key={j} d={line} stroke={j % 3 ? '#c5b7d7' : '#292f50'} strokeWidth={j % 3 ? .7 : 1.2} opacity={j % 3 ? .09 : .14} fill="none"/>) }
          </g>
        </g>
        <path d={ridge} stroke="#d7bcd4" strokeWidth={i < 2 ? 1.5 : .9} opacity={i < 2 ? .18 : .1} fill="none"/>
      </g>)}
      <path className="arc-dusk-texture" d="M0 0H1600V900H0Z" filter={`url(#${id}-grain)`}/>
    </svg>
    <div className="arc-dusk-shade"/>
    <canvas ref={canvas}/>
  </div>;
});
export default DuskAtmosphere;
