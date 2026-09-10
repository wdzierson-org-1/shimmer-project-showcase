export const DURATION = 24;
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
export function deviceFrame(seconds: number) {
  const time = Math.max(0, Math.min(DURATION, seconds));
  const settle = smooth((time - 1.6) / 4.2);
  return {
    time,
    drawing: clamp(time / 2.1),
    casing: smooth((time - 1.8) / 2.8),
    details: smooth((time - 2.8) / 2.5),
    wire: 1 - smooth((time - 3.4) / 1.8),
    screen: smooth((time - 4.6) / 1.1),
    settle,
    rotation: [-.32 + .14 * settle, -.44 + .18 * settle, -.1 + .22 * settle] as const,
    stage: time < 2.2 ? 'Schematic' : time < 5.6 ? 'Device' : 'Experience',
    view: time < 9.6 ? 'home' : time < 12 ? 'tour' : time < 18.5 ? 'map' : 'object',
    route: smooth((time - 12.6) / 4.8),
    object: smooth((time - 18.5) / .65),
    objectPhoto: smooth((time - 19) / 1.1),
  };
}
export function cameraDistance(aspect: number) {
  return Math.max(10.7, 4.25 / (Math.tan(17 * Math.PI / 180) * aspect));
}
