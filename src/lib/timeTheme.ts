type Vec3 = [number, number, number];

export interface TimeTheme {
  hour: number;
  bgRgb: Vec3;
  bgCss: string;
  colorA: Vec3;
  colorB: Vec3;
  colorC: Vec3;
  isLight: boolean;
}

export const CONTENT_BG_CSS = 'rgb(246, 243, 238)';

interface Keyframe {
  h: number;
  bg: Vec3;
  a: Vec3;
  b: Vec3;
  c: Vec3;
}

// Color keyframes around the 24-hour clock.
// bg = hero background, a/b/c = figure accent palette (warm / cool / edge).
const KF: Keyframe[] = [
  //       hour  background              colorA (warm)           colorB (cool)           colorC (edge)
  { h: 0,    bg: [0.02, 0.02, 0.06], a: [0.10, 0.85, 0.50], b: [0.00, 0.65, 0.75], c: [0.50, 0.20, 0.82] }, // midnight — aurora
  { h: 5,    bg: [0.06, 0.04, 0.13], a: [0.20, 0.65, 0.55], b: [0.15, 0.45, 0.65], c: [0.45, 0.25, 0.70] }, // pre-dawn
  { h: 7,    bg: [0.42, 0.32, 0.45], a: [1.00, 0.65, 0.40], b: [0.85, 0.40, 0.55], c: [1.00, 0.80, 0.30] }, // dawn
  { h: 9,    bg: [0.91, 0.93, 0.97], a: [0.95, 0.45, 0.30], b: [0.40, 0.65, 0.95], c: [0.30, 0.82, 0.65] }, // morning
  { h: 12,   bg: [0.965,0.955,0.935],a: [0.93, 0.36, 0.10], b: [0.50, 0.20, 0.80], c: [0.20, 0.35, 0.92] }, // midday
  { h: 16,   bg: [0.96, 0.94, 0.90], a: [0.95, 0.58, 0.15], b: [0.60, 0.30, 0.70], c: [0.95, 0.78, 0.18] }, // afternoon
  { h: 18.5, bg: [0.22, 0.08, 0.14], a: [0.92, 0.18, 0.22], b: [0.80, 0.22, 0.58], c: [1.00, 0.72, 0.10] }, // sunset
  { h: 20.5, bg: [0.05, 0.04, 0.11], a: [0.30, 0.20, 0.70], b: [0.10, 0.55, 0.65], c: [0.48, 0.12, 0.60] }, // evening
  { h: 24,   bg: [0.02, 0.02, 0.06], a: [0.10, 0.85, 0.50], b: [0.00, 0.65, 0.75], c: [0.50, 0.20, 0.82] }, // midnight wrap
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  const tc = Math.max(0, Math.min(1, t));
  return [lerp(a[0], b[0], tc), lerp(a[1], b[1], tc), lerp(a[2], b[2], tc)];
}

function vec3ToCss(v: Vec3): string {
  return `rgb(${Math.round(v[0] * 255)}, ${Math.round(v[1] * 255)}, ${Math.round(v[2] * 255)})`;
}

export function getTimeTheme(overrideHour?: number): TimeTheme {
  const now = new Date();
  const raw = overrideHour ?? now.getHours() + now.getMinutes() / 60;
  const h = ((raw % 24) + 24) % 24;

  for (let i = 0; i < KF.length - 1; i++) {
    if (h >= KF[i].h && h < KF[i + 1].h) {
      const t = (h - KF[i].h) / (KF[i + 1].h - KF[i].h);
      const bg = lerpVec3(KF[i].bg, KF[i + 1].bg, t);
      const lum = bg[0] * 0.299 + bg[1] * 0.587 + bg[2] * 0.114;
      return {
        hour: h,
        bgRgb: bg,
        bgCss: vec3ToCss(bg),
        colorA: lerpVec3(KF[i].a, KF[i + 1].a, t),
        colorB: lerpVec3(KF[i].b, KF[i + 1].b, t),
        colorC: lerpVec3(KF[i].c, KF[i + 1].c, t),
        isLight: lum > 0.45,
      };
    }
  }

  const k = KF[0];
  return {
    hour: 0,
    bgRgb: k.bg,
    bgCss: vec3ToCss(k.bg),
    colorA: k.a,
    colorB: k.b,
    colorC: k.c,
    isLight: false,
  };
}
