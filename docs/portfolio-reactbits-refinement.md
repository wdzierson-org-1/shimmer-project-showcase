# React Bits atmosphere refinement

The page combines three related treatments: a soft sage-to-amber aurora above the introduction, directional light over the terminal reel, and a large ASCII “Still building.” interlude between the selected projects and the practice. The career narrative and chapter-title decoding provide the focus inside the reel. All work is reviewable at `http://127.0.0.1:8081/practice.html`.

## References and adaptation

Reviewed the live demos and TypeScript source for all seven references. Source is pinned to [DavidHDev/react-bits, commit 0e69e737242df1d257b4e5e399b01ae1d7901375](https://github.com/DavidHDev/react-bits/tree/0e69e737242df1d257b4e5e399b01ae1d7901375). Copyright © 2026 David Haz. The MIT + Commons Clause license is included with the adapted source in `src/concepts/practice/motion/REACT_BITS_LICENSE.md` and with the published assets at `/portfolio/licenses/react-bits.txt`.

| Reference | Treatment |
| --- | --- |
| [Aurora](https://reactbits.dev/backgrounds/aurora) | Adapted fragment shader; custom sage, muted amber and peach colors, low opacity, grain and a vertical fade. Its opacity also recedes as the visitor scrolls. |
| [Side Rays](https://reactbits.dev/backgrounds/side-rays) | Adapted fragment shader; warm and cool directional light on the illustration side of the reel. A mask protects the copy. |
| [Dither](https://reactbits.dev/backgrounds/dither) | Adapted 8×8 Bayer quantization, softly mixed into the rays. |
| [Particle Text](https://reactbits.dev/text-animations/particle-text) | Adapted text-mask sampling and staggered particle gathering for “Still building.”, with deterministic scatter and a small mouse response. |
| [ASCII Text](https://reactbits.dev/text-animations/ascii-text) | Character-rendering approach adapted to a pre-rendered Canvas 2D glyph atlas and accessible text. |
| [Warp Text](https://reactbits.dev/text-animations/warp-text) | Visual influence for the shallow travelling fold in the ASCII word; the original refractive shader is not included. |
| [Scroll Expand](https://reactbits.dev/animations/scroll-expand) | Viewport-progress idea adapted to a small cover-scale change during normal document scrolling. |

The source adaptations use a shared WebGL2 surface and Canvas 2D. No additional runtime packages were needed. This retains the effects' relevant visual ideas without the multiple rendering dependencies in the complete reference implementations.

## Motion and accessibility

- Aurora and the reel cover run at 30 fps while visible. Each has a pause control. The soft shaders render at a maximum width of 1100 pixels, independent of device pixel density.
- Once the story begins, its single playback clock controls the rays, ASCII artwork and title reveal. Scrubbing updates the lighting; pausing freezes it. The six chapters still play in 54 seconds.
- Desktop cover scale moves from 0.88 to 1 with an eased viewport progress calculation. It uses passive page-scroll listeners and scheduled transform updates. Mobile, reduced motion and active playback use the full frame.
- The lower ASCII word gathers once, then ripples gently and shifts its light. It uses a cached glyph atlas at 30 fps. Mouse interaction is confined to the artwork; touch scrolling remains native. A pause control freezes it.
- Offscreen and hidden-tab animation loops stop. Live changes to the reduced-motion preference stop the ambient loops, show the completed ASCII word and switch the reel to manual chapters.
- The word and reel titles remain real text in the accessibility tree. Decorative canvases and cipher glyphs are hidden from assistive technology.
- Shader failure or absent WebGL2 falls back to CSS gradients. Without Canvas 2D, normal text, transparent poster artwork, manual chapters and the transcript remain available.

## Verification

Playwright inspected the hero, cover, live reel, and ASCII interlude at desktop and mobile sizes. All six chapter layouts were checked at 320px and 390px: no horizontal overflow, and minimum copy-to-controls gaps of 35.9px and 30px respectively.

A full 54-second desktop playback recorded 3,221 artwork and shader frames, a median interval of 16.7 ms and a 95th-percentile interval of 17.1 ms. Optional sound played and stopped on completion; replay restarted the story. These are local-browser measurements, not a guarantee for every GPU or device.

Checked keyboard seeking, fullscreen entry/exit, sound, pause/resume, reduced motion, manual chapters, and offscreen pausing. Renderer instrumentation confirmed that both ambient backgrounds stop while paused and offscreen; the ASCII interlude runs only when in view. Canvas snapshots confirmed the lower word freezes on pause and under reduced motion, and changes after resume. Deliberately disabled WebGL and all-canvas contexts to exercise both fallback paths. Console warnings and errors were clear in the final normal preview.

TypeScript, focused ESLint and the concept production build pass. Existing build notices concern stale Browserslist data and the optional CRT renderer's large bundle.

Desktop and mobile transparent cover assets are exported from the existing artwork at four seconds (`question-art.webp`, approximately 71 kB; `question-art-mobile.webp`, approximately 20 kB). The motion code, licensed source and assets are local changes; deployment is a separate step.
