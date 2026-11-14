import { useEffect, useRef, type CSSProperties } from 'react';
import { a, useAt, useFrame } from './clock';
import { WORDMARK } from './kit';
import { decrypt, easeInOut, lerp, seeded, span, W } from './timeline';

/* Stash's drawing kit, carried over from the product: the ST4SH wordmark and symbol path for path
   (src/components/brand/St4sh.tsx), the turning cursor, text that decrypts, and pictures that
   resolve from pixels. All of them are functions of the scene's clock. */

/** ST4SH. Size it by height; its width is 4.24 times that. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="30 30 3095.4 730" fill="currentColor" className={`sx-wordmark${className ? ` ${className}` : ''}`}>
      <g transform="translate(32 32)"><g transform="translate(-42.814 713.012) scale(1 -1)">
        {WORDMARK.map(([x, d]) => <path key={x} transform={`translate(${x} 0)`} fillRule="evenodd" d={d} />)}
      </g></g>
    </svg>
  );
}
/** The A/4 alone: wherever Stash itself acts. */
export function Symbol({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 724 764" fill="currentColor" className={`sx-symbol${className ? ` ${className}` : ''}`}>
      <path fillRule="evenodd" transform="translate(32 732) scale(1 -1)" d="M0 0 448 700H568V280H660V177H568V0H448V177H232L119 0ZM297 280H448V516Z" />
    </svg>
  );
}

/** The turning cursor, | / - \ at 130 ms a frame: Stash's busy state everywhere. */
export function Spinner({ from = 0 }: { from?: number }) {
  const frame = useAt((t) => Math.floor(Math.max(0, t - from) / 0.13) % 4);
  return <span className="sx-turn">{'|/-\\'[frame]}</span>;
}

/** Text that decrypts in: scrambled glyphs settle left to right, from `at` over `d` seconds. */
export function Decrypt({ text, at, d = 0.9, className }: { text: string; at: number; d?: number; className?: string }) {
  const shown = useAt((t) => decrypt(text, t, at, d));
  const settled = useAt((t) => (t < at ? 0 : Math.min(text.length, Math.floor(span(t, at, at + d) * (text.length + 1)))));
  return <span className={className}>{shown.slice(0, settled)}<span className="sx-cipher">{shown.slice(settled)}</span></span>;
}

const GREYS = ['#e9eae6', '#dfe1dc', '#d5d8d1', '#eff0ec'];
/** A picture Stash is still reading. `block(t)` is the size of its pixels at scene time t: 0 before the
    picture has arrived (the mosaic, a field that shimmers like a signal not yet locked), then the product's
    steps 26 → 18 → 12 → 8 → 5 → 3, and 1 for sharp. */
export function PixelImage({ src, w, h, focus = [0.5, 0.5], block, className, style }: {
  src: string; w: number; h: number; focus?: [number, number]; block: (t: number) => number; className?: string; style?: CSSProperties;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const image = useRef<HTMLImageElement>();
  const small = useRef<HTMLCanvasElement>();
  const drawn = useRef('');
  const now = useRef(0);
  const paint = (t: number) => {
    now.current = t;
    const el = canvas.current, ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const b = block(t), img = image.current;
    const ready = !!img && img.complete && img.naturalWidth > 0;
    // The mosaic re-rolls three times a second; a resolving picture only changes when its block size does.
    const key = b === 0 || !ready ? `m${Math.floor(t / 0.33)}` : `p${b}`;
    if (key === drawn.current) return;
    drawn.current = key;
    if (b === 0 || !ready) {
      const random = seeded(977 + Math.floor(t / 0.33) * 31);
      for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { ctx.fillStyle = GREYS[Math.floor(random() * 4)]; ctx.fillRect(x * 2, y * 2, 16, 16); }
      return;
    }
    // Cover-crop to the subject, as the card does.
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / scale, sh = h / scale;
    const sx = (img.naturalWidth - sw) * focus[0], sy = (img.naturalHeight - sh) * focus[1];
    if (b <= 1) { ctx.imageSmoothingEnabled = true; ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w * 2, h * 2); return; }
    const cols = Math.ceil(w / b), rows = Math.ceil(h / b);
    const tiny = small.current ?? (small.current = document.createElement('canvas'));
    tiny.width = cols; tiny.height = rows;
    const tctx = tiny.getContext('2d');
    if (!tctx) return;
    tctx.imageSmoothingEnabled = true;
    tctx.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tiny, 0, 0, cols, rows, 0, 0, cols * b * 2, rows * b * 2);
  };
  useEffect(() => {
    const img = new Image();
    img.onload = () => { drawn.current = ''; paint(now.current); };
    img.src = src;
    image.current = img;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
  useFrame(paint);
  return <canvas ref={canvas} width={w * 2} height={h * 2} className={className} style={{ width: w, height: h, display: 'block', ...style }} />;
}
/* ------------------------------------------------------------------ the pointer */

export type Spot = string | [number, number];

/** A pointer that glides to named spots (elements with data-spot) and presses on the beat.
    Each path entry is [the second it arrives, where]. `touch` draws a fingertip instead of an arrow. */
export function Pointer({ path, presses = [], touch }: { path: [number, Spot][]; presses?: number[]; touch?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  /** The last place each spot was found, for when its element has since left the page. */
  const known = useRef(new Map<number, [number, number]>());
  /** Where the glide under way set off from. */
  const origin = useRef<{ index: number; xy: [number, number] } | null>(null);
  const here = useRef<[number, number] | null>(null);
  const last = useRef(-1);
  const unsettled = useRef(0);

  /** Where a spot is right now. Measured on screen and divided back out, so content that is scrolled,
      zoomed or still animating into place is found where it actually is. */
  const find = (index: number): [number, number] => {
    const spot = path[index][1];
    if (Array.isArray(spot)) return spot;
    const world = ref.current?.closest<HTMLElement>('.sx-world');
    const el = world?.querySelector<HTMLElement>(`[data-spot="${spot}"]`);
    if (world && el) {
      const frame = world.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      const k = frame.width / W || 1;
      const xy: [number, number] = [(box.left + box.width / 2 - frame.left) / k, (box.top + box.height / 2 - frame.top) / k];
      known.current.set(index, xy);
      return xy;
    }
    return known.current.get(index) ?? here.current ?? [W / 2, 420];
  };

  useFrame((t) => {
    const el = ref.current;
    if (!el) return;
    // A jump in time (a seek) lands before React has redrawn; start afresh on that frame and the next.
    if (Math.abs(t - last.current) > 0.3) unsettled.current = 2;
    if (unsettled.current) { known.current.clear(); origin.current = null; here.current = null; unsettled.current--; }
    last.current = t;
    let index = path.findIndex(([arrive]) => t < arrive);
    if (index === -1) index = path.length;
    let xy: [number, number];
    if (index === 0 || index === path.length) {
      xy = find(Math.min(index, path.length - 1));
      origin.current = null;
    } else {
      const [arrive] = path[index];
      const travel = Math.min(0.72, arrive - path[index - 1][0]);
      const p = easeInOut(span(t, arrive - travel, arrive));
      if (p <= 0) {
        // Resting: stay on the spot, even if it moves.
        xy = find(index - 1);
        origin.current = null;
      } else {
        // A glide leaves from wherever the pointer was resting and aims at where its target is now,
        // so a target that is still scrolling into place is met where it ends up.
        if (origin.current?.index !== index) origin.current = { index, xy: here.current ?? find(index - 1) };
        const from = origin.current.xy, to = find(index);
        const bow = Math.sin(p * Math.PI) * 0.07;
        xy = [lerp(from[0], to[0], p) + (to[1] - from[1]) * bow, lerp(from[1], to[1], p) - (to[0] - from[0]) * bow];
      }
    }
    here.current = xy;
    const down = presses.some((press) => t >= press && t < press + 0.16);
    el.style.transform = `translate(${xy[0].toFixed(1)}px, ${xy[1].toFixed(1)}px) scale(${down ? 0.86 : 1})`;
    el.style.opacity = t >= path[0][0] - 0.25 ? '1' : '0';
  });

  return (
    <span ref={ref} className={`sx-pointer${touch ? ' is-touch' : ''}`} aria-hidden="true">
      {presses.map((press) => <i key={press} className="sx-ripple" {...a('ripple', press, 0.6)} />)}
      {touch ? <b /> : <svg viewBox="0 0 24 24"><path d="M5 3.2v15.6l4.2-4 2.7 6.2 2.6-1.1-2.6-6.1h5.9z" /></svg>}
    </span>
  );
}
