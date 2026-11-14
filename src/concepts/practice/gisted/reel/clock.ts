import { createContext, useContext, useEffect, useRef, useSyncExternalStore, type CSSProperties, type RefObject } from 'react';

/* One clock for the whole reel. Most motion is CSS, scrubbed from a custom property the player
   sets each frame. Components subscribe only for discrete things (typed text, a counter, a
   label), and re-render only when the value they derive actually changes. */

/** Props for an element whose entrance is scrubbed by the clock: it starts at `at` and lasts `d` seconds.
    These include `style`, so an element's own inline styles go in as the last argument, not beside the spread. */
export function a(name: string, at: number, d = 0.55, style?: CSSProperties) {
  return { 'data-a': name, style: { '--gr-at': at, '--gr-d': d, ...style } as CSSProperties };
}
export const vars = (values: Record<string, string | number>) => values as CSSProperties;

export interface Clock {
  /** Seconds since the start of the reel. */
  time: number;
  subscribe(listener: () => void): () => void;
  /** Work done by hand on every frame: each scene's clock and camera, then pointers and measured overlays.
      It runs before React commits that frame's re-render, which is why a seek paints a second time. */
  onFrame(listener: (time: number) => void): () => void;
  set(time: number): void;
}

export function createClock(): Clock {
  const listeners = new Set<() => void>();
  const frames = new Set<(time: number) => void>();
  const clock: Clock = {
    time: 0,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    onFrame(listener) { frames.add(listener); return () => { frames.delete(listener); }; },
    set(time) {
      clock.time = time;
      listeners.forEach((listener) => listener());
      frames.forEach((listener) => listener(time));
    },
  };
  return clock;
}

/** What a scene knows: the clock, when it starts, and the element its camera moves. */
export const SceneContext = createContext<{ clock: Clock; start: number; world: RefObject<HTMLDivElement> } | null>(null);

function useScene() {
  const scene = useContext(SceneContext);
  if (!scene) throw new Error('Reel scenes render inside a SceneContext.');
  return scene;
}

/** A value derived from the scene's local time. */
export function useAt<T extends string | number | boolean>(select: (local: number) => T): T {
  const { clock, start } = useScene();
  return useSyncExternalStore(clock.subscribe, () => select(clock.time - start));
}

/** Run `paint` with the scene's local time on every frame, and once on mount. */
export function useFrame(paint: (local: number) => void) {
  const { clock, start } = useScene();
  const latest = useRef(paint);
  latest.current = paint;
  useEffect(() => {
    latest.current(clock.time - start);
    return clock.onFrame((time) => latest.current(time - start));
  }, [clock, start]);
}
