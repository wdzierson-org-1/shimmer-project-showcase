import { CHAPTER_SECONDS, chapterAt } from './story';

/** All renderers share the player's clock, including direct seeks and replay. */
export function journeyFrame(seconds: number, still = false) {
  const chapter = chapterAt(seconds), local = Math.max(0, seconds - chapter * CHAPTER_SECONDS);
  if (chapter < 5) return {
    chapter, from: Math.max(0, chapter - 1), to: chapter,
    mix: still ? 1 : Math.min(1, local / 2.6), dissolve: 0,
  };
  // Reduced motion presents the interconnected form without the montage or dispersal.
  if (still) return { chapter, from: 7, to: 7, mix: 1, dissolve: 0 };
  const beats = [0, 1.8, 3.25, 4.85];
  const durations = [1.05, .9, 1, 1.1];
  let beat = 0;
  for (let i = 1; i < beats.length; i++) if (local >= beats[i]) beat = i;
  return {
    chapter, from: 4 + beat, to: 5 + beat,
    mix: Math.min(1, (local - beats[beat]) / durations[beat]),
    dissolve: Math.max(0, Math.min(1, (local - 7.15) / (CHAPTER_SECONDS - 7.15))),
  };
}

export const PARTICLE_INK = '#edf0f7';
export const PARTICLE_RGB = [237, 240, 247];
