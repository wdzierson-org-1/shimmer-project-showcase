import { useRef, type CSSProperties } from 'react';
import { a, useFrame } from './clock';
import { easeInOut, lerp, span, W } from './timeline';

/* Gisted's own drawing kit, carried over from the product so the reel looks like the app:
   stroke-only line icons, loose hand-drawn doodles, the wordmark, and the covers it draws when
   there is no picture of the thing itself. */

const ICONS: Record<string, string> = {
  sparkle: '<path d="M12 3.5c.7 4.3 3.2 6.8 7.5 7.5-4.3.7-6.8 3.2-7.5 7.5-.7-4.3-3.2-6.8-7.5-7.5 4.3-.7 6.8-3.2 7.5-7.5z"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.2"/><path d="M12 7.8h.01" stroke-width="2.6"/>',
  lines: '<path d="M4.5 6.5h15M4.5 10.5h15M4.5 14.5h10M4.5 18.5h6.5"/>',
  bulb: '<path d="M9.2 17.5h5.6M10.2 20.5h3.6M12 3.5a5.8 5.8 0 0 0-3.4 10.5c.6.5.9 1.2.9 2V17h5v-1c0-.8.3-1.5.9-2A5.8 5.8 0 0 0 12 3.5z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  list: '<path d="M9.5 7h10M9.5 12h10M9.5 17h10"/><path d="M5 7h.01M5 12h.01M5 17h.01" stroke-width="2.6"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  basket: '<path d="M3.5 9.5h17l-1.8 9.2a1.5 1.5 0 0 1-1.5 1.3H6.8a1.5 1.5 0 0 1-1.5-1.3zM8 9.5l3-5.5M16 9.5l-3-5.5M9 13v4M12 13v4M15 13v4"/>',
  users: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8M15.5 5.8a3 3 0 0 1 0 5.4M17 14.4c1.9.5 3.2 2 3.5 4.6"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17 5-4.5 4 3.5 2.5-2 4.5 4"/>',
  chat: '<path d="M5 5.5h14A1.5 1.5 0 0 1 20.5 7v8.5A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16"/>',
  clip: '<path d="M19 11.5 12 18.5a4.5 4.5 0 0 1-6.4-6.4l7.4-7.4a3 3 0 0 1 4.2 4.2l-7.3 7.3a1.5 1.5 0 0 1-2.1-2.1l6.6-6.6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  heart: '<path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10z"/>',
  browser: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 9h17"/><path d="M6.5 7h.01M9 7h.01" stroke-width="2.2"/>',
  play: '<path d="M8.5 5.8v12.4L18.5 12z"/>',
  linkedin: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 10.5v6M8 7.6h.01M11.5 16.5v-6M11.5 13c0-1.6 1-2.6 2.4-2.6s2.1.9 2.1 2.6v3.5"/>',
  xlogo: '<path d="M5 4.5h4l10 15h-4zM18.6 4.5 13.3 10.6M10.7 13.4 5.4 19.5"/>',
  video: '<rect x="3.5" y="6" width="12" height="12" rx="2"/><path d="m15.5 10.4 5-3v9.2l-5-3"/>',
  slides: '<rect x="3.5" y="4.5" width="17" height="11.5" rx="1.5"/><path d="M12 16v3.5M8.5 19.5h7M7.5 8.5h6M7.5 11.5h9"/>',
  book: '<path d="M5.5 5.5A1.5 1.5 0 0 1 7 4h11v13.5H7a1.5 1.5 0 0 0-1.5 1.5zM5.5 19A1.5 1.5 0 0 0 7 20.5h11v-3M9 8h5.5"/>',
  branch: '<circle cx="6.5" cy="5.5" r="1.8"/><circle cx="6.5" cy="18.5" r="1.8"/><circle cx="17.5" cy="8.5" r="1.8"/><path d="M6.5 7.3v9.4M6.5 13c0-3 2-4.5 9.2-4.5"/>',
  question: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.6"/><path d="M12 16.8h.01" stroke-width="2.6"/>',
  scale: '<path d="M4.5 18.5h15M6.5 18.5v-3M10 18.5v-6M13.5 18.5v-9M17 18.5V5.5"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  send: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  pot: '<path d="M4 10h16v6.5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM2.5 10H4M20 10h1.5M9.5 7c-.3-1.1.7-1.6.4-2.7M13.5 7c-.3-1.1.7-1.6.4-2.7"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
};

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      className={`gr-ico${className ? ` ${className}` : ''}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
      dangerouslySetInnerHTML={{ __html: ICONS[name] || ICONS.sparkle }}
    />
  );
}

/* Paths marked `d` (draw) can stroke themselves in, like a pen. pathLength normalizes every path
   to 1 so one keyframe pair draws any of them. */
const draw = (paths: string) => paths.replace(/<path d=/g, '<path pathLength="1" data-draw d=');
const DOODLES: Record<string, [string, string]> = {
  sparkle: ['0 0 48 48', draw('<path d="M24 6.5C25.4 17.2 30.8 22.6 41.5 24 30.8 25.4 25.4 30.8 24 41.5 22.6 30.8 17.2 25.4 6.5 24 17.2 22.6 22.6 17.2 24 6.5Z"/><path d="M37.5 7.5l2.6-2.8M41 12.6l3.8-.9M33.6 4.6l.6-3"/>')],
  star: ['0 0 48 48', draw('<path d="M24.2 5.6 29.4 17.6 42.1 18.8 32.3 27.2 35.5 39.9 24.4 32.9 12.9 40.2 16.2 27.4 6.1 19.1 19.2 17.5Z"/>')],
  squiggle: ['0 0 120 24', draw('<path d="M3 14C11 2.5 19.5 2.5 26 12S39.5 22 47.5 12 61.5 2.5 69.5 12 83 22 91.5 12 105.5 3 117 10"/>')],
  bubble: ['0 0 64 56', draw('<path d="M10.5 8.2C22 3.2 46 3.4 55.6 9.3 62 14 61.8 30 55 35.2 48 40.4 34.5 40.2 26.4 39.3L13.8 50l3.4-12.8C8.2 34.2 4.3 27.2 5 20.4 5.6 14.4 7.2 10.4 10.5 8.2Z"/>') + '<path d="M22 22.5h.5M32 22.5h.5M42 22.5h.5" stroke-width="3.6"/>'],
  arrow: ['0 0 120 90', draw('<path d="M6 12C30 4.5 61 6.5 69.5 26 75.5 41.5 58.5 51.5 50.5 40 42.5 28.5 66 20 82 33.5 96 45.5 103.5 59.5 107.5 77"/><path d="M96.5 69.5 107.6 78.4 112.2 64.6"/>')],
  arrowShort: ['0 0 64 44', draw('<path d="M4 33C13 15.5 31 7.5 51 12.5"/><path d="M42.5 5.2 52 12.6 43.6 20.4"/>')],
  smiley: ['0 0 48 48', draw('<path d="M24.2 6.1C36.3 5.6 43.2 14.2 42.6 24.6 42 35.1 34.1 42.6 23.6 42.1 13.2 41.6 5.6 34.2 6.1 23.6 6.6 13.6 13.6 6.6 24.2 6.1Z"/><path d="M15.6 28.2C19.2 34.2 28.8 34.6 32.8 28.1"/>') + '<path d="M17.5 19.5v3.2M30.5 19.5v3.2" stroke-width="2.4"/>'],
  confetti: ['0 0 64 64', '<path d="M8 20l6-4M20 6l2 6M40 10l6 2M54 22l-4 5M30 30l3 5M12 41l5 2M46 41l2 6M26 52l-5 3"/><circle cx="36" cy="22" r="1.6"/><circle cx="20" cy="30" r="1.6"/><circle cx="52" cy="54" r="1.6"/>'],
  underline: ['0 0 200 20', draw('<path d="M4 13C50 6.2 120 5 196 9.2"/>')],
  circle: ['0 0 100 50', draw('<path d="M52 4.2C80.4 3.4 97 12.2 96.2 25.4 95.4 39 72.4 47 47.2 46.2 21.8 45.4 4.2 37.2 4.4 24.2 4.6 12 22.2 5.2 44 6c6.4.2 14 2.2 19.2 5"/>')],
  quote: ['0 0 56 40', '<path d="M21.8 6.4C12.4 10.2 6.8 17.6 7.4 27.4c.4 5.8 6.6 8.8 11 5.4 4.2-3.4 2.2-10.4-3.8-10.2M47.8 6.4c-9.4 3.8-15 11.2-14.4 21 .4 5.8 6.6 8.8 11 5.4 4.2-3.4 2.2-10.4-3.8-10.2"/>'],
  spinner: ['0 0 24 24', '<path d="M12 3.6C17 3.7 20.4 7.6 20.3 12.1 20.2 16.9 16.4 20.5 11.8 20.4 7.3 20.3 3.6 16.7 3.7 12.1 3.8 8.3 6.4 5.2 10 4.2"/>'],
  loop: ['0 0 220 120', draw('<path d="M14 96C8 52 46 14 104 12c56-2 98 26 100 62 2 30-30 44-58 32"/><path d="M160 92 145 106 164 114"/>')],
};

/** A doodle. With `at`, its marked strokes draw themselves in from that second of the scene. */
export function Doodle({ name, className, at, d, style, strokeWidth = 1.8 }: { name: string; className?: string; at?: number; d?: number; style?: CSSProperties; strokeWidth?: number }) {
  const doodle = DOODLES[name];
  if (!doodle) return null;
  return (
    <svg
      className={`gr-doodle${at === undefined ? '' : ' gr-draws'}${className ? ` ${className}` : ''}`}
      viewBox={doodle[0]} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
      style={at === undefined ? style : ({ '--gr-dat': at, '--gr-dd': d ?? 0.8, ...style } as CSSProperties)}
      dangerouslySetInnerHTML={{ __html: doodle[1] }}
    />
  );
}

/** Lowercase "gisted", with a magenta outlined sparkle as the dot of the i (a dotless ı underneath). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`gr-wordmark${className ? ` ${className}` : ''}`} aria-hidden="true">
      g<span className="gr-wm-i">ı<svg className="gr-wm-spark" viewBox="0 0 24 24" focusable="false"><path d="M12 2.5c.8 5 4.5 8.7 9.5 9.5-5 .8-8.7 4.5-9.5 9.5-.8-5-4.5-8.7-9.5-9.5 5-.8 8.7-4.5 9.5-9.5z" /></svg></span>sted
    </span>
  );
}

export const Avatar = ({ name, className, light }: { name: string; className?: string; light?: boolean }) => (
  <span className={`gr-avatar${light ? ' is-light' : ''}${className ? ` ${className}` : ''}`} aria-hidden="true">
    {name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
  </span>
);

/** The video's typographic thumbnail, as the product draws it. Sizes itself to its box.
    `art` animates the drawing alone, leaving the black card it sits on in place. */
export function AliveThumb({ className, art }: { className?: string; art?: ReturnType<typeof a> }) {
  return (
    <div className={`gr-thumb${className ? ` ${className}` : ''}`} aria-hidden="true">
      <div className="gr-thumb-art" {...art}>
        <span className="gr-tj-by">Strange Loops</span>
        <span className="gr-tj-word">Alive?</span>
        <span className="gr-tj-line">quantum immortality, explained</span>
        <span className="gr-tj-code"><b className="gr-tj-hit">|alive⟩<Doodle name="circle" className="gr-tj-ring" /></b> + |dead⟩</span>
        <i className="gr-tj-time">14:30</i>
      </div>
    </div>
  );
}

export function BookCover() {
  return (
    <div className="gr-cover gr-cover--book" aria-hidden="true">
      <div className="gr-book">
        <span className="gr-book-spine" />
        <div className="gr-book-face">
          <span>Why things catch on</span>
          <b>Contagious</b>
          <Doodle name="squiggle" className="gr-book-squiggle" strokeWidth={3} />
          <em>Jonah Berger</em>
        </div>
      </div>
    </div>
  );
}

export function DeckCover() {
  return (
    <div className="gr-cover gr-cover--deck" aria-hidden="true">
      <div className="gr-deck">
        <Doodle name="sparkle" className="gr-deck-spark" />
        <span>Proposal for Q1</span>
        <b>Onboarding redesign</b>
        <em>14 slides</em>
      </div>
    </div>
  );
}

/* The product's own example photographs, cut from its "Made for whatever you're sharing" row. */
const SHEET = { src: '/portfolio/gisted/kinds.png', w: 1440, tile: 326, h: 244 };
const PHOTOS = { place: [204, 498], recipe: [557, 498], product: [910, 498] } as const;
export function Photo({ name, width }: { name: keyof typeof PHOTOS; width: number }) {
  const k = width / SHEET.tile;
  const [x, y] = PHOTOS[name];
  return (
    <div
      className="gr-cover gr-cover--photo" aria-hidden="true"
      style={{ backgroundImage: `url(${SHEET.src})`, backgroundSize: `${SHEET.w * k}px auto`, backgroundPosition: `${-x * k}px ${-y * k}px` }}
    />
  );
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
    const world = ref.current?.closest<HTMLElement>('.gr-world');
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
    <span ref={ref} className={`gr-pointer${touch ? ' is-touch' : ''}`} aria-hidden="true">
      {presses.map((press) => <i key={press} className="gr-ripple" {...a('ripple', press, 0.6)} />)}
      {touch ? <b /> : <svg viewBox="0 0 24 24"><path d="M5 3.2v15.6l4.2-4 2.7 6.2 2.6-1.1-2.6-6.1h5.9z" /></svg>}
    </span>
  );
}
