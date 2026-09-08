# Homepage copy and continuous career story

The homepage uses the revised Project Ariadne, Google Beijing, Smithsonian, and Agentic OS headlines. Noodle replaces Optum in the curated featured section, using its existing primary image and canonical case link. Its image dimensions now match the source. Optum remains available in All work; no project records, archive order, or captions were changed.

The 54-second career story keeps its six chapters, decoded headings, optional score, transcript, and playback controls. The revised narrative connects curiosity to learning the craft, early mobile work, purpose in healthcare, founding and building Noodle in 2023, and continuing to lead, build, and write about AI.

## Visual implementation

`JourneyScene.tsx` progressively enhances the original ASCII renderer with Three.js. One field of glyph particles moves between the question, craft spiral, mobile globe, heart and voice waveform, connected source material, and an open horizon. Surface samples are sorted into spatial bands before morphing so neighboring characters travel together. Fine contour lines and traveling highlights give the forms depth.

The renderer uses 22,000 particles on desktop and 10,500 on mobile, bounds pixel ratio at 1.75, and paints at 30 fps while the existing player clock and controls remain independent. Geometry is sampled once per mount, GPU buffers are reused across chapter changes, and every animation follows the player's time. The renderer owns no animation loop. It is loaded only after Play; pause, seeking, reduced motion, offscreen pause, and teardown remain controlled by the player. The original canvas ASCII renderer remains the fallback when WebGL is unavailable or lost.

ThreeUI's particle lettering, topographic studies, and connected topology informed the visual approach. The Fibonacci node placement and distance-linked topology adapt the public Nexus Topology source. The reference checkout was `MengTo/threeui` at `68802d5428071ada5c20db8094b1649e6bb770ed`. Attribution and the MIT notice are retained in `src/concepts/practice/arc/THREEUI_LICENSE.md`. No third-party demo pages, fonts, remote scripts, or new package dependencies are included.

## Validation

- Focused TypeScript and ESLint checks and the production Vite build passed.
- All 17 existing chat, routing, and project-order regressions passed.
- Playwright verified the five featured headlines and the Noodle case link against the production build.
- All six chapter forms and headings, seeking to the end, and replay were exercised. Pausing preserved both the timer and an identical screenshot of the canvas across successive captures.
- The new scene and Three.js chunk were absent from network requests before Play.
- At 390px and 320px, chapter copy cleared the controls and the page had no horizontal overflow. With reduced motion, the story stayed static and offered manual chapter navigation.
- A browser with WebGL disabled successfully used the original canvas renderer and chapter navigation. No page errors were observed.
