import { useEffect, useRef, type ImgHTMLAttributes } from 'react';
import './work-image.css';

type Props = ImgHTMLAttributes<HTMLImageElement> & { treatment?: 'feature' | 'archive' | 'detail' };
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const noise = (x: number, y: number) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };

// One scroll scheduler for the visible image planes. No idle animation loop.
const subscribers = new Set<() => void>();
let scrollFrame = 0;
const queueScroll = () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; subscribers.forEach(paint => paint()); });
};
function observeScroll(paint: () => void) {
  if (!subscribers.size) {
    window.addEventListener('scroll', queueScroll, { passive: true }); window.addEventListener('resize', queueScroll);
  }
  subscribers.add(paint); paint();
  return () => {
    subscribers.delete(paint);
    if (!subscribers.size) {
      window.removeEventListener('scroll', queueScroll); window.removeEventListener('resize', queueScroll);
      cancelAnimationFrame(scrollFrame); scrollFrame = 0;
    }
  };
}

/** Original pixel sweep and image-plane entrance, inspired by the public React Bits Pro previews.
 * The real image stays in the document. The temporary mask never reads image pixels or needs WebGL.
 */
export default function WorkImage({ treatment = 'feature', ...props }: Props) {
  const host = useRef<HTMLDivElement>(null), plane = useRef<HTMLDivElement>(null), image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const element = host.current, surface = plane.current, picture = image.current;
    if (!element || !surface || !picture) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)'), desktop = matchMedia('(min-width:801px)');
    let visible = false, eligible = false, revealed = false, disposed = false, frame = 0, mask: HTMLCanvasElement | null = null;
    let entrance: Animation | null = null, unwatch: (() => void) | undefined;
    element.dataset.reveal = 'waiting';
    const paintDepth = () => {
      if (!visible || motion.matches || !desktop.matches || treatment !== 'feature') { surface.style.transform = ''; return; }
      const rect = element.getBoundingClientRect();
      const progress = clamp((innerHeight - rect.top) / (innerHeight + rect.height));
      const depth = (progress - .5) * 2;
      surface.style.transform = `perspective(1800px) translate3d(0,${(-depth * 10).toFixed(2)}px,0) rotateX(${(depth * .7).toFixed(3)}deg)`;
    };
    const finish = () => {
      cancelAnimationFrame(frame); entrance?.cancel(); entrance = null; mask?.remove(); mask = null;
      element.dataset.reveal = 'complete'; revealed = true;
    };
    const reveal = () => {
      if (disposed || revealed || !visible || document.hidden || !picture.complete || !picture.naturalWidth) return;
      // A lazy image may acquire its height on load, before ResizeObserver delivers its new threshold.
      const rect = element.getBoundingClientRect();
      const shown = Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top);
      eligible = shown + 1 >= Math.min(element.clientHeight * .42, innerHeight * .38);
      if (!eligible) return;
      revealed = true;
      if (motion.matches) { finish(); return; }
      const duration = treatment === 'feature' ? 1050 : treatment === 'archive' ? 620 : 650;
      // The outer plane settles independently from the small, scroll-driven inner-plane movement.
      entrance = element.animate([
        { transform: `perspective(1800px) translateY(${desktop.matches ? 24 : 12}px) rotateX(${desktop.matches ? 2 : 0}deg) scale(.978)` },
        { transform: 'perspective(1800px) translateY(0) rotateX(0deg) scale(1)' },
      ], { duration, easing: 'cubic-bezier(.16,1,.3,1)' });
      mask = document.createElement('canvas'); mask.className = 'work-image-mask'; mask.setAttribute('aria-hidden', 'true');
      const ctx = mask.getContext('2d');
      if (!ctx) { mask = null; element.dataset.reveal = 'complete'; return; }
      const width = Math.max(1, surface.clientWidth), height = Math.max(1, surface.clientHeight);
      const ratio = Math.min(1, 1100 / width); mask.width = Math.round(width * ratio); mask.height = Math.round(height * ratio);
      ctx.scale(ratio, ratio);
      const cols = treatment === 'archive' ? 16 : desktop.matches ? 40 : 22, cell = width / cols;
      const rows = Math.ceil(height / cell);
      const tiles = Array.from({ length: cols * rows }, (_, i) => {
        const x = i % cols, y = Math.floor(i / cols);
        return { x: x * cell, y: y * cell, delay: (x / cols * .58 + y / rows * .42) * .64 + noise(x, y) * .14 };
      });
      surface.appendChild(mask); element.dataset.reveal = 'building';
      const start = performance.now();
      const draw = (now: number) => {
        if (disposed || !mask) return;
        const progress = clamp((now - start) / duration);
        ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#e4e7dc';
        for (const tile of tiles) {
          const open = clamp((progress - tile.delay) / .22);
          if (open === 1) continue;
          ctx.globalAlpha = 1 - open * open;
          ctx.fillRect(tile.x, tile.y, cell + .7, cell + .7);
        }
        if (progress < 1) frame = requestAnimationFrame(draw); else finish();
      };
      draw(start);
    };
    const observeDepth = () => {
      unwatch?.(); unwatch = undefined;
      if (visible && !motion.matches && desktop.matches && treatment === 'feature') unwatch = observeScroll(paintDepth);
      else paintDepth();
    };
    const preferences = () => { if (motion.matches) finish(); observeDepth(); };
    const hide = () => { if (document.hidden && revealed) finish(); else if (!document.hidden) reveal(); };
    const focus = () => { finish(); };
    const error = () => { finish(); };
    // Wait for 42% of a normal image, capped at 38% of the viewport for tall screenshots.
    // A proportional threshold is rebuilt after layout changes, so tall case images can also qualify.
    let observer: IntersectionObserver | undefined;
    const observeVisibility = () => {
      observer?.disconnect();
      const required = Math.min(element.clientHeight * .42, innerHeight * .38);
      observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        eligible = entry.intersectionRect.height + 1 >= required;
        if (!visible && revealed) finish();
        observeDepth(); reveal();
      }, { threshold: [0, Math.min(.42, required / Math.max(1, element.clientHeight))] });
      observer.observe(element);
    };
    const sizing = new ResizeObserver(observeVisibility); sizing.observe(element); observeVisibility();
    window.addEventListener('resize', observeVisibility);
    if (motion.matches || (picture.complete && !picture.naturalWidth)) finish();
    picture.addEventListener('load', reveal); picture.addEventListener('error', error);
    element.parentElement?.addEventListener('focusin', focus);
    motion.addEventListener('change', preferences); desktop.addEventListener('change', preferences); document.addEventListener('visibilitychange', hide);
    return () => {
      disposed = true; finish(); unwatch?.(); observer?.disconnect(); sizing.disconnect(); window.removeEventListener('resize', observeVisibility);
      picture.removeEventListener('load', reveal); picture.removeEventListener('error', error);
      element.parentElement?.removeEventListener('focusin', focus); motion.removeEventListener('change', preferences); desktop.removeEventListener('change', preferences);
      document.removeEventListener('visibilitychange', hide); surface.style.transform = '';
    };
  }, [props.src, treatment]);
  return <div ref={host} className={`work-image work-image-${treatment}`}><div className="work-image-plane" ref={plane}><img {...props} ref={image} decoding="async"/></div></div>;
}
