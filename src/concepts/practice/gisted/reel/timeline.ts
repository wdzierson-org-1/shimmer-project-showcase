/* The Gisted reel's timeline. Every scene, caption, camera move and particle formation is a
   function of one clock, so pausing, seeking and a reduced-motion still all come for free.
   Pure data and math: no DOM and no three.js, so it runs under node for tests.

   The picture is composed on a fixed 1280 × 720 canvas. The DOM scenes and the WebGL layer share
   one pan-and-zoom camera over that canvas, which is why text stays crisp DOM while particles
   line up with it exactly. */

export const W = 1280;
export const H = 720;
/** Vertical field of view of the WebGL camera, and the distance at which 1 unit is 1 canvas px. */
export const FOV = 30;
export const D0 = H / 2 / Math.tan((FOV / 2) * Math.PI / 180);

/* ------------------------------------------------------------------ math */

export const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** How far `t` is through [a, b], clamped to 0..1. */
export const span = (t: number, a: number, b: number) => (b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
export const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
export const easeIn = (n: number) => { const t = clamp(n); return t * t * t; };
export const easeOut = (n: number) => 1 - Math.pow(1 - clamp(n), 3);
export const easeInOut = (n: number) => { const t = clamp(n); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
/** Linear keyframes: the value at `t` along [[time, value], …]. */
export function keyed(t: number, frames: readonly (readonly [number, number])[]): number {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [t1, v1] = frames[i];
    if (t <= t1) { const [t0, v0] = frames[i - 1]; return lerp(v0, v1, span(t, t0, t1)); }
  }
  return frames[frames.length - 1][1];
}
/** The value of the latest step at or before `t`. */
export function stepped<T>(t: number, frames: readonly (readonly [number, T])[]): T {
  let value = frames[0][1];
  for (const [at, v] of frames) if (t >= at) value = v;
  return value;
}
/** How much of `text` has been typed by `t`, from `start` at `cps` characters a second. */
export const typed = (text: string, t: number, start: number, cps: number) =>
  t < start ? '' : text.slice(0, Math.min(text.length, Math.floor((t - start) * cps)));
export const formatTime = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
/** A small seeded generator, so formations and hand-drawn wobble are the same on every visit. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ the story */

export const STORY = {
  url: 'youtube.com/watch?v=HQQtaWgIQmE',
  host: 'youtube.com',
  title: 'Quantum immortality, explained',
  channel: 'Strange Loops',
  duration: '14:30',
  dek: 'The strangest idea to come out of many-worlds: if every quantum outcome happens, you only ever experience the branches where you survive. Why it’s so hard to argue with, and why even Max Tegmark says it doesn’t apply to ordinary death.',
  take: 'Fourteen minutes that broke my brain a little.',
  post: 'If many-worlds is true, could you never experience your own death? A 14-minute explainer on quantum immortality, and why even Max Tegmark says it doesn’t apply to real life:',
  question: 'Do you buy the argument, or does it feel like a trick?',
  statement: 'This was worth the time.',
  answer: 'The catch at 10:05 got me. Sending this to my brother.',
  found: 'Found 7 things in the video, and 3 more that could make your page more useful.',
  share: 'gisted.page/quantum-immortality-explained',
};

/* ------------------------------------------------------------------ scenes */

export type SceneId = 'hook' | 'paste' | 'pipeline' | 'board' | 'customize' | 'kinds' | 'send' | 'hearback' | 'system' | 'close';
export interface Caption { at: number; kicker: string; text: string }
/** A camera key: the canvas point at the centre of the frame, and the zoom. `ease` shapes the move into this key. */
export interface CamKey { at: number; x: number; y: number; zoom: number; ease?: 'in' | 'out' | 'inout' }
export interface Camera { x: number; y: number; zoom: number }
export interface SceneDef {
  id: SceneId;
  /** The chapter button. */
  label: string;
  start: number;
  dur: number;
  /** The frame shown when motion is reduced: the moment the scene is about. */
  still: number;
  /** How long the scene stays mounted after it ends, under the next one's entrance. */
  post: number;
  /** What happens in it, in a sentence: read aloud for the picture, and printed in the transcript. */
  alt: string;
  captions: Caption[];
  cam: CamKey[];
}

const CENTRE = { x: W / 2, y: H / 2, zoom: 1 };

/* Where things sit on the canvas, shared by the DOM scenes and the particle formations. */

/** The app window, and the source card at the centre of step 1. */
export const WIN = { x: 90, y: 24, w: 1100, h: 600, bar: 28, head: 48 };
export const ITEM = { x: 500, y: 222, w: 280, media: 157.5 };
export const THUMB = { x: ITEM.x + ITEM.w / 2, y: ITEM.y + ITEM.media / 2 };
/** How far the camera pushes into the source card: far enough that its black fills a stage four times wider than tall. */
export const DIVE = 12;

/** The title card: the pasted link, and the spark it becomes. */
export const TITLE = { link: { x: 640, y: 412, font: 28 }, spark: { x: 640, y: 172, size: 196 } };

/** The pipeline, laid out left to right in canvas px. The camera travels along it. */
export const PL = {
  y: 340,
  link: { x: 380, y: 340, font: 30 },
  gate: { x: 800, y: 340, r: 46 },
  lanes: [
    { id: 'details', label: 'video details', note: 'title · channel · 14:30 · published', cx: 1030, cy: 96, share: 0.14 },
    { id: 'transcript', label: 'transcript', note: '2,214 words, timestamped', cx: 1040, cy: 596, share: 0.86 },
  ],
  page: { x: 1212, y: 222, w: 176, h: 236 },
  model: { x: 1500, y: 340, h: 268 },
  tile: { w: 150, h: 68, x0: 1640, dx: 164, y0: 180, dy: 84 },
  check: { x: 2400, y: 340, r: 46 },
} as const;

export interface Tile { kind: 'finding' | 'section' | 'suggestion'; icon: string; label: string; col: number; row: number }
const tile = (kind: Tile['kind'], icon: string, label: string, col: number, row: number): Tile => ({ kind, icon, label, col, row });
/** What the model streams for this video, in the order the events arrive. */
export const TILES: Tile[] = [
  tile('finding', 'info', 'What it is', 0, 0),
  tile('finding', 'sparkle', 'Summary', 0, 1),
  tile('finding', 'clock', 'Key moments', 0, 2),
  tile('finding', 'lines', 'Transcript', 0, 3),
  tile('finding', 'image', 'Diagram on screen', 1, 0),
  tile('finding', 'users', 'Mentions', 1, 1),
  tile('finding', 'bulb', 'The catch', 1, 2),
  tile('section', 'sparkle', 'Summary', 2, 0),
  tile('section', 'clock', 'Key moments', 2, 1),
  tile('section', 'route', 'Where it comes from', 2, 2),
  tile('section', 'bulb', 'The catch', 2, 3),
  tile('suggestion', 'branch', 'A diagram', 3, 0),
  tile('suggestion', 'list', 'A glossary', 3, 1),
  tile('suggestion', 'link', 'Further reading', 3, 2),
];
export const tileRect = (t: Tile) => ({ x: PL.tile.x0 + t.col * PL.tile.dx, y: PL.tile.y0 + t.row * PL.tile.dy, w: PL.tile.w, h: PL.tile.h });

/** The model's sweep across the evidence, and the flight of each word it keeps (pipeline-local seconds). */
export const WRITE = { t0: 8.0, t1: 11.2, stagger: 1.6 };
const WRITE_DEPART = WRITE.stagger / (1 + WRITE.stagger);
/** When tile `i` appears: just before the words it is made of arrive. */
export const tileAt = (i: number) =>
  WRITE.t0 + (WRITE_DEPART * (i + 0.5) / TILES.length + (1 - WRITE_DEPART) * 0.62) * (WRITE.t1 - WRITE.t0);
/** When the sweep has crossed the whole page. */
export const SWEEP_END = WRITE.t0 + WRITE_DEPART * (WRITE.t1 - WRITE.t0);

/** The system: what one gist travels through. Positions are canvas px. */
export interface SystemNode { id: string; label: string; sub?: string; x: number; y: number; weight: number; hub?: boolean }
export const NODES: SystemNode[] = [
  { id: 'app', label: 'React + TypeScript', sub: 'the app', x: 236, y: 268, weight: 1 },
  { id: 'ext', label: 'Chrome extension', sub: 'gist any tab', x: 196, y: 420, weight: 0.8 },
  { id: 'host', label: 'Vercel', sub: 'hosting', x: 300, y: 552, weight: 0.7 },
  { id: 'base', label: 'Supabase', sub: 'Postgres · Auth · Storage', x: 520, y: 400, weight: 1.9, hub: true },
  { id: 'auth', label: 'Google + Apple sign-in', x: 560, y: 566, weight: 0.7 },
  { id: 'edge', label: '40+ edge functions', sub: 'the back end', x: 770, y: 300, weight: 1.4 },
  { id: 'engine', label: 'Enrichment engine', sub: 'shared with the API', x: 960, y: 212, weight: 1.2 },
  { id: 'model', label: 'Claude', sub: 'streams the page', x: 1112, y: 330, weight: 1 },
  { id: 'video', label: 'Video generation', sub: 'from the page', x: 1000, y: 448, weight: 0.9 },
  { id: 'pay', label: 'Stripe', sub: 'billing', x: 800, y: 540, weight: 0.8 },
];
export const EDGES: [string, string][] = [
  ['app', 'base'], ['ext', 'base'], ['host', 'app'], ['base', 'auth'], ['base', 'edge'],
  ['edge', 'engine'], ['engine', 'model'], ['edge', 'video'], ['edge', 'pay'],
];
/** The path one gist takes, lit in order. */
export const TRACE = ['app', 'base', 'edge', 'engine', 'model'];

const scenes: Omit<SceneDef, 'start'>[] = [
  {
    id: 'hook', label: 'Intro', dur: 7, still: 6.2, post: 0, captions: [],
    alt: 'A bare link sits in a message, delivered, seen and unanswered. Its letters lift off and gather into the Gisted spark above the line: Don’t just send a link. Send the gist.',
    cam: [{ at: 0, ...CENTRE, zoom: 1.06 }, { at: 7, ...CENTRE, zoom: 1, ease: 'out' }],
  },
  {
    id: 'paste', label: 'Paste', dur: 6.5, still: 2.9, post: 0,
    alt: 'On the Gisted homepage a YouTube link is pasted into the composer and Get the gist is pressed. The app opens the video, and the view dives into its card.',
    captions: [{ at: 0.2, kicker: '01 · Paste', text: 'Paste anything you’d usually just forward: a video, an article, a deck, a recipe.' }],
    cam: [
      { at: 0, ...CENTRE }, { at: 1.1, ...CENTRE },
      { at: 2.2, x: 640, y: 424, zoom: 1.36 }, { at: 3.55, x: 640, y: 424, zoom: 1.36 },
      { at: 4.4, ...CENTRE }, { at: 5.25, ...CENTRE },
      { at: 6.5, x: THUMB.x, y: THUMB.y, zoom: DIVE, ease: 'in' },
    ],
  },
  {
    id: 'pipeline', label: 'Under the hood', dur: 16.5, still: 12.6, post: 0,
    alt: 'Inside the enrichment function. The link passes admission, then the video’s details and its 2,214-word transcript are read in parallel into one evidence document whose coverage is recorded. Claude streams the page as JSON: seven findings, four sections and three things to add, each used as it closes. Every mention is checked for a quote in the source, and one without a quote is dropped. The draft passes a quality floor and streams to the browser.',
    captions: [
      { at: 0.3, kicker: 'Under the hood', text: 'One click starts a pipeline. This is what happens behind the spinner.' },
      { at: 2.3, kicker: '1 · Read', text: 'It opens the source itself: the video’s details and its full transcript, read in parallel.' },
      { at: 5.7, kicker: '2 · Evidence', text: 'Everything it read becomes one evidence document, with its coverage on record.' },
      { at: 8.0, kicker: '3 · Write', text: 'Claude streams the page as JSON. Each object is used the moment it closes.' },
      { at: 11.3, kicker: '4 · Ground', text: 'A name stays only if its quote is found in the source. No quote, no mention.' },
      { at: 13.5, kicker: '5 · Check', text: 'A quality floor, with one bounded repair pass if the draft falls short.' },
      { at: 15.3, kicker: 'Deliver', text: 'Then it streams to your screen, one finding at a time.' },
    ],
    cam: [
      { at: 0, x: 380, y: 340, zoom: 1.7 }, { at: 1.5, x: 380, y: 340, zoom: 1.7 },
      { at: 3.2, x: 760, y: 340, zoom: 1.14 }, { at: 5.4, x: 1010, y: 340, zoom: 1 },
      { at: 6.8, x: 1260, y: 340, zoom: 1.34 }, { at: 8.0, x: 1300, y: 340, zoom: 1.34 },
      { at: 9.6, x: 1740, y: 340, zoom: 1 }, { at: 11.1, x: 1820, y: 340, zoom: 1 },
      { at: 12.0, x: 1690, y: 330, zoom: 1.03 }, { at: 13.5, x: 1690, y: 330, zoom: 1.03 },
      { at: 14.5, x: 2150, y: 330, zoom: 1.12 }, { at: 15.2, x: 2170, y: 330, zoom: 1.12 },
      { at: 16.5, x: 1380, y: 350, zoom: 0.44 },
    ],
  },
  {
    id: 'board', label: 'Findings', dur: 7.6, still: 5.6, post: 0.5,
    alt: 'Back in the app, the findings land around the video one by one, each on a hand-drawn line: what it is, a summary, key moments, the transcript, the diagram on screen, who is mentioned and the catch, then three things Gisted could add. It found 7 things, and 3 more that could make the page more useful.',
    captions: [{ at: 0.7, kicker: '02 · Get the gist', text: 'Not just a summary. The key moments, the people, the catch, and what’s worth adding.' }],
    cam: [{ at: 0, x: THUMB.x, y: THUMB.y, zoom: DIVE }, { at: 1.4, ...CENTRE, ease: 'out' }],
  },
  {
    id: 'customize', label: 'Your take', dur: 10.4, still: 7.8, post: 0,
    alt: 'On the page editor Sam types a take, “Fourteen minutes that broke my brain a little”, which readers will see first. Then one of Gisted’s suggestions is added and the thought experiment draws itself as a branching tree.',
    captions: [
      { at: 0.3, kicker: '03 · Make it yours', text: 'Your take comes first. It’s the first thing people read.' },
      { at: 4.3, kicker: '03 · Make it yours', text: 'Then add what Gisted suggests, like a diagram that makes the idea click.' },
    ],
    cam: [
      { at: 0, ...CENTRE }, { at: 0.7, ...CENTRE },
      { at: 1.5, x: 500, y: 372, zoom: 1.46 }, { at: 3.3, x: 520, y: 372, zoom: 1.46 },
      { at: 4.1, ...CENTRE }, { at: 5.0, ...CENTRE },
      { at: 6.0, x: 500, y: 380, zoom: 1.5 }, { at: 7.9, x: 516, y: 380, zoom: 1.5 },
      { at: 8.8, ...CENTRE },
    ],
  },
  {
    id: 'kinds', label: 'Any content', dur: 6.5, still: 5.4, post: 0,
    alt: 'Six kinds of thing, each with what Gisted adds: a video gets a diagram, a book gets book-club questions, slides get a rating, a place gets a calendar of who is free, a recipe gets a grocery list and a product gets a poll.',
    captions: [{ at: 0.3, kicker: 'Any content', text: 'A video, a book, a deck, a place, a recipe, a product. Each gets what it needs.' }],
    cam: [{ at: 0, x: 640, y: 306, zoom: 1.17 }, { at: 6.5, x: 640, y: 306, zoom: 1.12, ease: 'out' }],
  },
  {
    id: 'send', label: 'Send', dur: 7.5, still: 5.9, post: 0,
    alt: 'On the send step Gisted writes the X post, Sam adds a question for readers, and Copy post publishes the page.',
    captions: [
      { at: 0.3, kicker: '04 · Send', text: 'Gisted writes the post. You decide how people can answer.' },
      { at: 5.3, kicker: '04 · Send', text: 'One click publishes the page.' },
    ],
    cam: [
      { at: 0, ...CENTRE }, { at: 0.9, ...CENTRE },
      { at: 1.7, x: 520, y: 360, zoom: 1.3 }, { at: 3.0, x: 540, y: 360, zoom: 1.3 },
      { at: 3.8, ...CENTRE },
    ],
  },
  {
    id: 'hearback', label: 'Hear back', dur: 9.5, still: 6.4, post: 0,
    alt: 'A reader’s phone shows Sam’s take first. She reacts, rates it four of five and answers Sam’s question, and each response arrives in Sam’s feed. Then she starts a gist of her own.',
    captions: [
      { at: 0.3, kicker: '05 · Hear back', text: 'People read your take first. Then they answer.' },
      { at: 5.6, kicker: '05 · Hear back', text: 'It all comes back to one place. And every reader can make a gist of their own.' },
    ],
    cam: [{ at: 0, ...CENTRE, zoom: 1.05 }, { at: 9.5, ...CENTRE, zoom: 1 }],
  },
  {
    id: 'system', label: 'The system', dur: 8, still: 6.6, post: 0,
    alt: 'The system as a diagram around Supabase: the React app, a Chrome extension, Vercel, sign-in with Google and Apple, more than forty edge functions, the shared enrichment engine and Claude, video generation and Stripe. The path of one gist lights up from the app to the model.',
    captions: [{ at: 0.4, kicker: 'The system', text: 'Designed, built and run by one person: the app, the back end, the pipeline, billing, an extension, video.' }],
    cam: [{ at: 0, ...CENTRE, zoom: 1.08 }, { at: 8, ...CENTRE, zoom: 1, ease: 'out' }],
  },
  {
    id: 'close', label: 'Outro', dur: 6, still: 4.6, post: 0, captions: [],
    alt: 'The particles gather into the spark once more above the Gisted wordmark. Don’t just send a link. Send the gist. gisted.co.',
    cam: [{ at: 0, ...CENTRE, zoom: 1.05 }, { at: 6, ...CENTRE, zoom: 1, ease: 'out' }],
  },
];

export const SCENES: SceneDef[] = [];
{
  let start = 0;
  for (const scene of scenes) { SCENES.push({ ...scene, start }); start += scene.dur; }
}
export const TOTAL = SCENES.reduce((sum, s) => sum + s.dur, 0);
const byId = Object.fromEntries(SCENES.map((s) => [s.id, s])) as Record<SceneId, SceneDef>;
export const scene = (id: SceneId) => byId[id];
/** A scene-local second as a second of the whole reel. */
export const at = (id: SceneId, local: number) => byId[id].start + local;

export function sceneIndexAt(t: number) {
  for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].start) return i;
  return 0;
}
/** Scenes on screen at `t`: the current one, and one still finishing underneath. */
export function mountedAt(t: number): number[] {
  const current = sceneIndexAt(t);
  const out: number[] = [];
  for (let i = 0; i < SCENES.length; i++) {
    const s = SCENES[i];
    if (i === current || (i < current && t < s.start + s.dur + s.post)) out.push(i);
  }
  return out;
}
export function captionAt(t: number): (Caption & { key: string }) | null {
  const i = sceneIndexAt(t);
  const s = SCENES[i];
  const local = t - s.start;
  let found: Caption | null = null;
  for (const c of s.captions) if (local >= c.at) found = c;
  return found ? { ...found, key: `${s.id}-${found.at}` } : null;
}

const EASES = { in: easeIn, out: easeOut, inout: easeInOut };
/** A scene's own camera at its local time. Before its first key and after its last, it holds. */
export function cameraOf(s: SceneDef, local: number): Camera {
  const keys = s.cam;
  if (local <= keys[0].at) return { x: keys[0].x, y: keys[0].y, zoom: keys[0].zoom };
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i];
    if (local < b.at) {
      const a = keys[i - 1];
      const p = EASES[b.ease ?? 'inout'](span(local, a.at, b.at));
      // Zoom moves geometrically, so a long push reads as steady rather than rushing at the end.
      return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), zoom: a.zoom * Math.pow(b.zoom / a.zoom, p) };
    }
  }
  const last = keys[keys.length - 1];
  return { x: last.x, y: last.y, zoom: last.zoom };
}
export const cameraAt = (t: number): Camera => {
  const s = SCENES[sceneIndexAt(clamp(t, 0, TOTAL))];
  return cameraOf(s, t - s.start);
};

/* ------------------------------------------------------------------ particles */

export type Formation = 'titleLink' | 'spark' | 'scatter' | 'pipeLink' | 'page' | 'tiles' | 'tilesOut' | 'nodes';
export type Order = 'seed' | 'queue' | 'sweep';
interface Segment { t0: number; t1: number; a: Formation; b: Formation; mode: 0 | 1; stagger: number; turb: number; order: Order }
export interface ParticleState {
  /** Blend from formation `a` to `b` by `p` (0..1, before each particle's own stagger). */
  a: Formation; b: Formation; p: number;
  /** 0: a curved flight. 1: the pipeline's route, through the gate and down a lane. */
  mode: 0 | 1;
  stagger: number; turb: number; order: Order;
  /** Opacity of every particle, and of the ones the model didn't keep. */
  alpha: number; bulk: number;
  /** 0: dots. 1: word-length dashes. */
  dash: number;
  /** The share of particles tinted magenta. */
  magenta: number;
  /** Canvas x of the model's sweep across the evidence, or far off-canvas. */
  sweep: number;
}

const HOOK = byId.hook.start, PIPE = byId.pipeline.start, SYS = byId.system.start, CLOSE = byId.close.start;
const hold = (t: number, f: Formation): Segment => ({ t0: t, t1: t, a: f, b: f, mode: 0, stagger: 0, turb: 0, order: 'seed' });
const SEGMENTS: Segment[] = [
  hold(-1, 'titleLink'),
  { t0: HOOK + 2.95, t1: HOOK + 4.9, a: 'titleLink', b: 'spark', mode: 0, stagger: 0.55, turb: 120, order: 'seed' },
  { t0: HOOK + 6.3, t1: HOOK + 7.5, a: 'spark', b: 'scatter', mode: 0, stagger: 0.3, turb: 60, order: 'seed' },
  hold(PIPE - 0.6, 'pipeLink'),
  { t0: PIPE + 1.7, t1: PIPE + 6.4, a: 'pipeLink', b: 'page', mode: 1, stagger: 1.5, turb: 0, order: 'queue' },
  { t0: PIPE + WRITE.t0, t1: PIPE + WRITE.t1, a: 'page', b: 'tiles', mode: 0, stagger: WRITE.stagger, turb: 30, order: 'sweep' },
  { t0: PIPE + 15.0, t1: PIPE + 16.3, a: 'tiles', b: 'tilesOut', mode: 0, stagger: 0.5, turb: 0, order: 'seed' },
  hold(PIPE + 16.5, 'scatter'),
  { t0: SYS + 0.35, t1: SYS + 2.5, a: 'scatter', b: 'nodes', mode: 0, stagger: 0.6, turb: 70, order: 'seed' },
  { t0: CLOSE + 0.1, t1: CLOSE + 2.3, a: 'nodes', b: 'spark', mode: 0, stagger: 0.5, turb: 90, order: 'seed' },
];
const ALPHA: [number, number][] = [
  [HOOK + 2.5, 0], [HOOK + 2.8, 1], [HOOK + 6.4, 1], [HOOK + 7.4, 0],
  [PIPE + 0.15, 0], [PIPE + 0.7, 1], [PIPE + 15.2, 1], [PIPE + 16.25, 0],
  [SYS + 0.3, 0], [SYS + 1.4, 0.85], [CLOSE, 0.85], [CLOSE + 1.2, 1],
];
const BULK: [number, number][] = [[PIPE + 9.4, 1], [PIPE + 11.4, 0.5], [PIPE + 14.6, 0.42], [PIPE + 15.4, 0], [PIPE + 16.5, 0], [PIPE + 16.6, 1]];
const MAGENTA: [number, number][] = [
  [HOOK + 3.0, 0], [HOOK + 4.6, 0.9], [HOOK + 7.5, 0.9], [PIPE - 0.6, 0.06], [PIPE + 16.4, 0.06],
  [SYS, 0.3], [CLOSE + 0.3, 0.3], [CLOSE + 2.0, 0.9],
];

export function particlesAt(time: number): ParticleState {
  const t = clamp(time, 0, TOTAL);
  let seg = SEGMENTS[0];
  for (const s of SEGMENTS) if (t >= s.t0) seg = s;
  const flying = t < seg.t1;
  const local = t - PIPE;
  return {
    a: flying ? seg.a : seg.b, b: seg.b, p: flying ? span(t, seg.t0, seg.t1) : 1,
    mode: flying ? seg.mode : 0, stagger: seg.stagger, turb: flying ? seg.turb : 0, order: seg.order,
    alpha: keyed(t, ALPHA), bulk: keyed(t, BULK),
    dash: local >= 1.7 && local < 16.5 ? (seg.b === 'page' && flying ? 0 : 1) : 0,
    magenta: keyed(t, MAGENTA),
    sweep: local >= WRITE.t0 - 0.25 && local <= SWEEP_END + 0.5
      ? lerp(PL.page.x - 16, PL.page.x + PL.page.w + 16, span(local, WRITE.t0, SWEEP_END)) : -1e5,
  };
}

/** The backdrop behind everything: how dark, how much of the dotted engine-room floor, how lit. */
export function backdropAt(time: number) {
  const t = clamp(time, 0, TOTAL);
  const paste = byId.paste.start, board = byId.board.start;
  // Black for the dive into the source card, through the pipeline, and back out.
  const engine = Math.min(span(t, paste + 5.4, paste + 6.3), 1 - span(t, board + 0.5, board + 1.3));
  return {
    engine,
    dots: Math.min(span(t, PIPE + 0.1, PIPE + 0.9), 1 - span(t, PIPE + 15.9, PIPE + 16.5)),
    // A little more light on the scenes with no app window in front.
    glow: 0.55 + 0.45 * Math.max(1 - span(t, HOOK + 6.4, HOOK + 7.4), Math.min(span(t, byId.kinds.start - 0.4, byId.kinds.start + 0.4), 1 - span(t, byId.send.start - 0.3, byId.send.start + 0.4)), span(t, byId.hearback.start - 0.3, byId.hearback.start + 0.5)),
  };
}

/** Rings that travel out through the dust when something is pressed: [time, canvas x, canvas y]. */
export const PULSES: [number, number, number][] = [
  [at('paste', 3.4), 863, 420],
  [at('board', 6.5), 640, 535],
  [at('send', 5.44), 724, 568],
  [at('close', 2.2), TITLE.spark.x, TITLE.spark.y],
];
