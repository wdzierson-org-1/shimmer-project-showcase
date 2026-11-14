/* The Stash film's timeline. Every scene, caption, camera move and particle formation is a
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
/** Text arriving the way Stash's card titles do: glyphs settle left to right from `start` over `d` seconds.
    Before `start` it is empty; unsettled cells show a cipher that re-rolls about sixteen times a second. */
const CIPHER = '#%&/<>=+*:;01[]{}$@';
export function decrypt(text: string, t: number, start: number, d: number): string {
  if (t < start) return '';
  if (t >= start + d) return text;
  const settled = Math.floor(span(t, start, start + d) * (text.length + 1));
  const beat = Math.floor(t / 0.06);
  let out = text.slice(0, settled);
  for (let i = settled; i < text.length; i++) {
    out += text[i] === ' ' ? ' ' : CIPHER[(Math.imul(i + 7, 2654435761) + Math.imul(beat + 3, 40503)) >>> 7 & 15];
  }
  return out;
}
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

/** One save, followed the whole way: the product's own example from gostash.it. The video and its creator are illustrative. */
export const STORY = {
  url: 'https://www.tiktok.com/@sundaysupper/video/7391836274',
  short: 'tiktok.com/@sundaysupper/video/7391836274',
  host: 'tiktok.com',
  creator: '@sundaysupper',
  length: '0:58',
  title: 'Tomato & mozzarella penne',
  desc: 'A 20-minute weeknight pasta: blistered tomatoes, torn mozzarella, basil.',
  onScreen: '20-MINUTE DINNER, 5 INGREDIENTS',
  what: 'recipe video for a 20-minute tomato and mozzarella pasta',
  ingredients: ['penne', 'cherry tomatoes', 'mozzarella', 'basil', 'olive oil'],
  summary: 'Blister cherry tomatoes in olive oil, toss with penne and pasta water, finish with mozzarella and basil.',
  findBy: 'that tomato pasta tiktok / quick weeknight pasta',
  /** What the reader records when it recovered speech and one cover image (tiktokCandidate.ts). */
  coverage: 'Speech and one cover image recovered; remaining video visuals not inspected.',
  ask: 'that quick pasta with the tomatoes?',
  answer: 'That’s Tomato & mozzarella penne, a TikTok from @sundaysupper you saved three weeks ago. Twenty minutes, five ingredients.',
  prompt: 'Make a shopping list from that pasta video I saved.',
  query: 'pasta video',
  promise: ['Save it fast.', 'Find it when', 'you need it.'],
  closing: 'Stash is smarter saving.',
  site: 'gostash.it',
};

/* ------------------------------------------------------------------ scenes */

export type SceneId = 'hook' | 'save' | 'pipeline' | 'enriched' | 'kinds' | 'ask' | 'ai' | 'system' | 'close';
/** What the scene is printed on: the brand's lime field, paper, or the machine's black. */
export type Ground = 'lime' | 'paper' | 'ink';
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
  ground: Ground;
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

/* Where things sit on the canvas, shared by the DOM scenes and the WebGL layer. */

/** The card being saved, on the right of the save scene; and the same card at the centre once it is enriched. */
export const SAVED = { x: 760, y: 150, w: 300, media: 196 };
export const CARD = { x: 490, y: 96, w: 300, media: 196 };
/** How close the camera is to the card on either side of the trip through the machine. */
export const NEAR = 1.9;

/** The pipeline, laid out left to right in canvas px. The camera travels along it. */
export const PL = {
  y: 330,
  link: { x: 330, y: 196 },
  save: { x: 150, y: 250, w: 360 },
  read: { x: 760, speech: { x: 880, y: 150, w: 330, h: 150 }, cover: { x: 880, y: 372, w: 124, h: 150 }, text: { x: 1024, y: 396 } },
  evidence: { x: 1330, y: 214, w: 300, h: 178 },
  write: { draft: { x: 1790, y: 190 }, review: { x: 1790, y: 380 }, card: { x: 2010, y: 196, w: 300 } },
  index: { patch: { x: 2440, y: 150 }, chunks: { x: 2440, y: 268, w: 150, h: 34, n: 4, dy: 44 }, vectors: { x: 2690, y: 268, w: 230, rows: 4, cols: 23 } },
  settle: { x: 3070, y: 168, w: 300 },
  end: 3420,
} as const;
/** The five things a TikTok save must pass to settle as complete (enrichmentQuality.ts). */
export const SETTLE = ['transcript', 'title', 'description', 'preview', 'index'];
/** Pipeline-local seconds at which each stage begins. */
export const BEAT = { save: 0.5, response: 3.1, read: 4.2, evidence: 7.0, write: 8.6, review: 10.3, index: 12.4, embed: 14.0, settle: 16.5, done: 18.5, later: 19.0 };
export const settleAt = (i: number) => BEAT.settle + 0.5 + i * 0.3;

/** The system: what one save travels through. Positions are canvas px. */
export interface SystemNode { id: string; label: string; sub?: string; x: number; y: number; hub?: boolean }
export const NODES: SystemNode[] = [
  { id: 'ios', label: 'iPhone app + share sheet', sub: 'SwiftUI', x: 190, y: 150 },
  { id: 'ext', label: 'Chrome extension', sub: 'Manifest V3', x: 160, y: 290 },
  { id: 'web', label: 'Web app', sub: 'React · Vite · Vercel', x: 190, y: 430 },
  { id: 'mcp', label: 'Your AI, over MCP', sub: 'OAuth · read-only', x: 290, y: 560 },
  { id: 'edge', label: 'Edge functions', sub: 'save · read · search · ask', x: 500, y: 330 },
  { id: 'read', label: 'Source readers', sub: 'Firecrawl · SearchApi · Mapbox', x: 650, y: 130 },
  { id: 'model', label: 'OpenAI models', sub: 'read · write · embed', x: 700, y: 540 },
  { id: 'base', label: 'Supabase', sub: 'Postgres · pgvector · Storage · Auth · Realtime', x: 890, y: 330, hub: true },
  { id: 'pay', label: 'Stripe', sub: 'billing', x: 1100, y: 180 },
  { id: 'cron', label: 'Timed workers', sub: 'facts · assess · repair', x: 1090, y: 480 },
];
export const EDGES: [string, string][] = [
  ['ios', 'edge'], ['ext', 'edge'], ['web', 'edge'], ['mcp', 'edge'], ['edge', 'base'], ['edge', 'read'], ['edge', 'model'],
  ['base', 'cron'], ['cron', 'model'], ['base', 'pay'],
];
/** The path of one save, lit in order: the phone posts to an edge function, which writes the row and calls the models. */
export const TRACE: [string, string][] = [['ios', 'edge'], ['edge', 'base'], ['edge', 'model']];

const scenes: Omit<SceneDef, 'start'>[] = [
  {
    id: 'hook', label: 'Intro', dur: 7, ground: 'lime', still: 4.6, post: 0, captions: [],
    alt: 'On a lime field, black tags pile up: a link, a screenshot, a voice memo, a PDF. Things saved and never found again. Then the promise: Save it fast. Find it when you need it.',
    cam: [{ at: 0, ...CENTRE, zoom: 1.06 }, { at: 7, ...CENTRE, zoom: 1, ease: 'out' }],
  },
  {
    id: 'save', label: 'Save', dur: 9, ground: 'paper', still: 6.4, post: 0,
    alt: 'On an iPhone, a TikTok recipe video is shared: tap Share, tap Stash, and the sheet says saved. A new card prints into the library straight away, its picture still unresolved, labelled “gathering more info”. The view moves in on the card.',
    captions: [
      { at: 0.3, kicker: '01 · Save', text: 'Share from any app. Two taps, and you keep going.' },
      { at: 4.9, kicker: '01 · Save', text: 'The card is there at once. Stash reads it in the background.' },
    ],
    cam: [
      { at: 0, x: 560, y: 360, zoom: 1.08 }, { at: 0.9, x: 560, y: 360, zoom: 1.08 },
      { at: 1.8, x: 330, y: 400, zoom: 1.5 }, { at: 3.9, x: 330, y: 420, zoom: 1.5 },
      { at: 4.9, x: 700, y: 350, zoom: 1.12 }, { at: 7.3, x: 720, y: 350, zoom: 1.12 },
      { at: 9, x: SAVED.x + SAVED.w / 2, y: SAVED.y + 150, zoom: NEAR, ease: 'in' },
    ],
  },
  {
    id: 'pipeline', label: 'Under the hood', dur: 21.5, ground: 'ink', still: 15.4, post: 0,
    alt: 'Inside the machine. The save is admitted and answered at once, with its status pending. After the response, Stash recovers what was said in the video and, because the transcript is short, reads one cover image; it records that the rest of the visuals were not inspected. One model drafts the card and a second reviews it. The patch is applied without touching the owner’s own note, the text is cut into chunks of up to 1,200 characters and embedded as 1,536-number vectors, and the save settles as complete only when transcript, title, description, preview and index all pass.',
    captions: [
      { at: 0.3, kicker: 'Under the hood', text: 'The save answers at once. The reading happens after.' },
      { at: 4.2, kicker: '1 · Read', text: 'It recovers what was said, and reads the cover when that runs thin.' },
      { at: 8.6, kicker: '2 · Write', text: 'One model drafts the card. A second one reviews it.' },
      { at: 12.4, kicker: '3 · Index', text: 'The text is chunked and embedded, so it can be found by meaning.' },
      { at: 16.5, kicker: '4 · Settle', text: 'Complete only if every piece passed. Otherwise it says partial.' },
    ],
    cam: [
      { at: 0, x: 350, y: 300, zoom: 1.5 }, { at: 1.0, x: 350, y: 300, zoom: 1.5 },
      { at: 2.0, x: 380, y: 330, zoom: 1.35 }, { at: 3.6, x: 400, y: 330, zoom: 1.35 },
      { at: 4.6, x: 990, y: 336, zoom: 1.2 }, { at: 6.7, x: 1040, y: 336, zoom: 1.2 },
      { at: 7.6, x: 1400, y: 330, zoom: 1.35 }, { at: 8.5, x: 1430, y: 330, zoom: 1.35 },
      { at: 9.7, x: 2000, y: 320, zoom: 1.3 }, { at: 12.2, x: 2040, y: 320, zoom: 1.3 },
      { at: 13.2, x: 2670, y: 330, zoom: 1.3 }, { at: 16.2, x: 2700, y: 330, zoom: 1.3 },
      { at: 17.2, x: 3210, y: 340, zoom: 1.35 }, { at: 20.3, x: 3230, y: 340, zoom: 1.35 },
      { at: 21.5, x: 3230, y: 340, zoom: 1.7, ease: 'in' },
    ],
  },
  {
    id: 'enriched', label: 'Enriched', dur: 9, ground: 'paper', still: 6.6, post: 0,
    alt: 'Back on the card. Its picture resolves from coarse pixels to sharp, the title decrypts into “Tomato & mozzarella penne”, and windows land around it on drawn leaders: what it is, the ingredients, the words on screen, who made it, a summary, and what to find it by.',
    captions: [
      { at: 0.5, kicker: '02 · Enriched', text: 'What it is, what’s in it, who made it, and the words on screen.' },
      { at: 5.2, kicker: '02 · Enriched', text: 'So later you can find it by what it was about.' },
    ],
    cam: [
      { at: 0, x: CARD.x + CARD.w / 2, y: CARD.y + 150, zoom: NEAR }, { at: 1.5, x: 640, y: 330, zoom: 1.04, ease: 'out' },
      { at: 4.6, x: 640, y: 336, zoom: 1.04 }, { at: 5.6, x: 640, y: 372, zoom: 1.12 }, { at: 9, x: 640, y: 378, zoom: 1.1 },
    ],
  },
  {
    id: 'kinds', label: 'Anything', dur: 7.5, ground: 'paper', still: 5.6, post: 0,
    alt: 'A library of six saves prints in, each read in its own way: a screenshot whose text was read, a voice note that was transcribed, an eighteen-page paper, a repository, an article and a book cover that became a title and an author.',
    captions: [{ at: 0.4, kicker: 'Anything', text: 'A screenshot, a voice note, a paper, a repo, a book cover. Each one gets read.' }],
    cam: [{ at: 0, x: 640, y: 350, zoom: 1.08 }, { at: 7.5, x: 640, y: 344, zoom: 1.02, ease: 'out' }],
  },
  {
    id: 'ask', label: 'Find it', dur: 9.5, ground: 'paper', still: 7.2, post: 0,
    alt: 'Three weeks later, in the web app, the Ask Stash window is opened and a question is typed: “that quick pasta with the tomatoes?” Stash searches by meaning, by words and by the owner’s own notes, then answers with the saved video, and the library narrows to that card.',
    captions: [
      { at: 0.3, kicker: '03 · Find it', text: 'Weeks later, ask in your own words.' },
      { at: 4.3, kicker: '03 · Find it', text: 'It searches by meaning, by words and by your own notes, then cites the card.' },
    ],
    cam: [
      { at: 0, ...CENTRE }, { at: 0.8, ...CENTRE },
      { at: 1.7, x: 400, y: 400, zoom: 1.25 }, { at: 6.3, x: 416, y: 400, zoom: 1.25 },
      { at: 7.3, ...CENTRE },
    ],
  },
  {
    id: 'ai', label: 'In your AI', dur: 10, ground: 'paper', still: 7.4, post: 0,
    alt: 'In Claude, with Stash connected, someone asks for a shopping list from the pasta video they saved. Claude calls search_stash, reads what Stash gathered, and writes the list: penne, cherry tomatoes, mozzarella, basil, olive oil. Below, the assistants Stash works with.',
    captions: [
      { at: 0.3, kicker: '04 · In your AI', text: 'Connect once, and your AI can search everything you’ve saved.' },
      { at: 5.4, kicker: '04 · In your AI', text: 'It gets the substance, not a bare link. Read-only, and you approve each app.' },
    ],
    cam: [
      { at: 0, ...CENTRE, zoom: 1.03 }, { at: 1.0, ...CENTRE, zoom: 1.03 },
      { at: 2.0, x: 640, y: 330, zoom: 1.3 }, { at: 6.6, x: 640, y: 350, zoom: 1.3 },
      { at: 7.6, ...CENTRE },
    ],
  },
  {
    id: 'system', label: 'The system', dur: 8.5, ground: 'ink', still: 6.8, post: 0,
    alt: 'The system as a diagram: an iPhone app with a share sheet, a Chrome extension, the web app and AI assistants over MCP all reach Supabase through its edge functions, which call source readers and OpenAI models; timed workers and Stripe sit behind the database. The path of one save lights up: from the phone to an edge function, then to the database and the models.',
    captions: [{ at: 0.4, kicker: 'The system', text: 'One product on four surfaces: iPhone, Chrome, the web, and inside your AI.' }],
    cam: [{ at: 0, ...CENTRE, zoom: 1.08 }, { at: 8.5, ...CENTRE, zoom: 1, ease: 'out' }],
  },
  {
    id: 'close', label: 'Outro', dur: 6.5, ground: 'lime', still: 5, post: 0, captions: [],
    alt: 'On the lime field again: Stash is smarter saving. The wordmark assembles from halftone dots. gostash.it.',
    cam: [{ at: 0, ...CENTRE, zoom: 1.05 }, { at: 6.5, ...CENTRE, zoom: 1, ease: 'out' }],
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

/* ------------------------------------------------------------------ the ground and the dots */

/** The ground behind everything. Between scenes it changes by a halftone wipe: dots of the next ground grow
    out of the last one until they close over it. */
const WIPE = { before: 0.5, after: 0.12 };
export function groundAt(time: number): { a: Ground; b: Ground; p: number } {
  const t = clamp(time, 0, TOTAL);
  const i = sceneIndexAt(t);
  const here = SCENES[i];
  const next = SCENES[i + 1];
  if (next && next.ground !== here.ground && t >= next.start - WIPE.before) return { a: here.ground, b: next.ground, p: span(t, next.start - WIPE.before, next.start + WIPE.after) };
  const last = SCENES[i - 1];
  if (last && last.ground !== here.ground && t < here.start + WIPE.after) return { a: last.ground, b: here.ground, p: span(t, here.start - WIPE.before, here.start + WIPE.after) };
  return { a: here.ground, b: here.ground, p: 1 };
}

export type Formation = 'pool' | 'link' | 'speech' | 'evidence' | 'chunks' | 'vectors' | 'gone' | 'nodes' | 'mark';
interface Segment { t0: number; t1: number; a: Formation; b: Formation; stagger: number; turb: number }
export interface ParticleState {
  /** Blend from formation `a` to `b` by `p` (0..1, before each dot's own stagger). */
  a: Formation; b: Formation; p: number;
  stagger: number; turb: number;
  alpha: number;
  /** How much of the halftone pool along the bottom is showing. */
  pool: number;
}

const HOOK = byId.hook.start, PIPE = byId.pipeline.start, SYS = byId.system.start, CLOSE = byId.close.start;
const hold = (t: number, f: Formation): Segment => ({ t0: t, t1: t, a: f, b: f, stagger: 0, turb: 0 });
const SEGMENTS: Segment[] = [
  hold(-1, 'pool'),
  hold(PIPE - 0.4, 'link'),
  { t0: PIPE + BEAT.read, t1: PIPE + BEAT.read + 2.3, a: 'link', b: 'speech', stagger: 1.2, turb: 26 },
  { t0: PIPE + BEAT.evidence, t1: PIPE + BEAT.evidence + 1.3, a: 'speech', b: 'evidence', stagger: 0.7, turb: 18 },
  { t0: PIPE + BEAT.index + 0.2, t1: PIPE + BEAT.index + 1.5, a: 'evidence', b: 'chunks', stagger: 0.6, turb: 40 },
  { t0: PIPE + BEAT.embed, t1: PIPE + BEAT.embed + 1.9, a: 'chunks', b: 'vectors', stagger: 1.1, turb: 12 },
  hold(PIPE + BEAT.embed + 2.0, 'gone'),
  hold(SYS - 0.3, 'gone'),
  { t0: SYS + 0.4, t1: SYS + 2.6, a: 'gone', b: 'nodes', stagger: 0.6, turb: 50 },
  hold(CLOSE - 0.3, 'pool'),
  { t0: CLOSE + 0.5, t1: CLOSE + 2.8, a: 'pool', b: 'mark', stagger: 0.9, turb: 30 },
];
const ALPHA: [number, number][] = [
  [0, 0], [PIPE + 0.2, 0], [PIPE + 0.8, 1], [PIPE + BEAT.write - 0.4, 1], [PIPE + BEAT.write + 0.3, 0.16],
  [PIPE + BEAT.index - 0.1, 0.16], [PIPE + BEAT.index + 0.5, 1], [PIPE + BEAT.embed + 1.0, 1], [PIPE + BEAT.embed + 1.9, 0],
  [SYS + 0.3, 0], [SYS + 1.2, 0.9], [SYS + 7.4, 0.9], [SYS + 8.1, 0],
  [CLOSE + 0.3, 0], [CLOSE + 0.9, 1],
];
const POOL: [number, number][] = [[0, 0], [0.5, 1], [HOOK + 6.1, 1], [HOOK + 6.9, 0], [CLOSE + 0.1, 0], [CLOSE + 0.7, 0.8], [CLOSE + 1.3, 0.8], [CLOSE + 2.6, 0]];

export function particlesAt(time: number): ParticleState {
  const t = clamp(time, 0, TOTAL);
  let seg = SEGMENTS[0];
  for (const s of SEGMENTS) if (t >= s.t0) seg = s;
  const flying = t < seg.t1;
  return {
    a: flying ? seg.a : seg.b, b: seg.b, p: flying ? span(t, seg.t0, seg.t1) : 1,
    stagger: seg.stagger, turb: flying ? seg.turb : 0,
    alpha: keyed(t, ALPHA), pool: keyed(t, POOL),
  };
}
