# Still asking why

The homepage reel is a 54-second personal story, adapted from Will’s reflections about becoming a designer. Animated ASCII forms carry the narrative in six nine-second chapters. This replaces the earlier Three.js ribbon study; that source and the original video montage remain available as earlier iterations, but are not loaded by this player.

1. **A question:** “How can this be made better?” An extruded serif question mark with a soft bevel, directional lighting, a slow turn and fine orbital traces.
2. **Why:** curiosity becoming understanding and craft. One continuous, growing spiral, with fine ribs and construction lines that suggest accumulated experience.
3. **Untethered:** extraordinary opportunities at Yahoo, Google and Salesforce; early mobile design and a new relationship with information. A dimensional mobile device in front of a rotating globe, with information moving along three orbital paths.
4. **Purpose:** healthcare, Grand Rounds and Included Health. A warm copper heart with volume and a quiet pulse. A layered voice waveform connects “feeling heard” with the healthcare voice work.
5. **Possibility:** AI brings back the excitement of a new beginning. Source documents connect to a rotating lattice of relationships, reflecting early RAG, founding Noodle, designing and building, and writing about agent accountability.
6. **What’s next:** the question returns above an open horizon, framed by an unfinished aperture. After 25+ years, curiosity continues.

The user’s own account supplies the personal narrative; career anchors come from the résumé and published work already reviewed. “My first great information revolution” frames mobile as a personal experience. The transcript identifies Noodle as historical work, since dissolved. No CMS records were changed.

## Visual and audio direction

A future terminal atmosphere: deep blue-green, phosphor sage, parchment and warm copper. Soft directional rays, fine dithering, static scan lines, restrained grain, registration marks and slowly drifting points add depth around large, left-aligned type. The ASCII sculptures dissolve into each other over 1.9 seconds. Real perspective, a depth buffer, surface normals, diffuse light, highlights and rim lighting give the fine characters volume. Each chapter uses a distinct composition; restrained paths and construction lines carry the theme without adding fictional telemetry. The rays are adapted from React Bits; source attribution and the wider page treatment are documented in `portfolio-reactbits-refinement.md`.

Each chapter title begins with a short cursor blink. A narrow frontier of cipher characters resolves from left to right, with the full title readable within 1.8 seconds. Text width and wrapping stay fixed throughout the effect. A single playback clock controls the reveal and artwork. Pausing or scrubbing while paused immediately resolves the title; reduced motion skips decoding entirely. The original title text remains intact in the DOM and has a stable accessible heading label. No announcement of changing symbols is sent to screen readers.

Mobile uses an illustration above the copy, with enough room for controls at widths down to 320px. The title effect does not move the paragraph or controls.

The original, optional instrumental score uses warm sustained chords and sparse synthesized notes. The last chapter returns to the opening harmony and fades out. There is no sampled music, narration, voice cloning or external generation service. Audio is requested only when a visitor enables sound.

## Implementation

- `src/concepts/practice/arc/story.ts`: narrative, chapter timing and time formatting.
- `src/concepts/practice/arc/AsciiScene.tsx`: Canvas 2D ASCII renderer with perspective projection, depth buffering, directional surface lighting, a cached glyph atlas, deterministic transitions and palette changes. Up to 220 columns on desktop; finer 2.65px cells on small screens. The lazy production chunk is approximately 11.1 kB (5.0 kB gzip). The character artwork works independently of the optional WebGL background.
- `arc/journeyGeometry.ts`: original, cached parametric geometry for the question, craft spiral, globe, device, heart, knowledge lattice and source documents. Question-mark bevels come from a locally drawn glyph’s distance field. No external 3D models or new dependencies.
- `arc/DecodedTitle.tsx`: deterministic cursor and cipher reveal; fixed typography; static accessible text.
- `CareerReel.tsx`: playback clock, scrubbing, chapter navigation, keyboard controls, sound, fullscreen and the readable transcript.
- `arc/arc.css`: composition, typography, responsive layout and reduced-motion styling.
- `motion/ShaderBackdrop.tsx`, `motion/shaderSurface.ts`, `motion/shaders.ts`: shared, bounded WebGL2 background renderer and adapted Aurora / Side Rays shaders. CSS gradients provide the fallback. The reel's player clock drives its rays after playback starts; a quiet pause control is available on the cover.
- `motion/useScrollExpansion.ts`: gentle expansion of the cover during normal desktop page scrolling. Playback, mobile and reduced motion use the full frame.
- `public/portfolio/reel/question-art*.webp`: transparent, double-resolution desktop/mobile captures of the actual ASCII artwork at four seconds, shown over the light rays before interaction. The character renderer mounts when the story starts. The older opaque `question-poster*.webp` assets remain archived.
- `question-score.m4a`: 54-second original instrumental, approximately 758 kB.
- `scripts/portfolio/render_question_score.py`: reproducible score synthesis with Python’s standard library and ffmpeg.

The slower-moving character sculptures are capped at 30 frames per second, with pixel density capped at 2; the existing 60fps player clock continues to drive type, lighting and controls. Surface normals are shaded only after visibility is resolved, once per occupied character, and a cached density curve avoids per-character exponentiation. The glyph atlas, geometry and depth/light buffers are reused between frames. Vertex projection does not allocate objects or sort points per frame. The soft background is capped at 1100 render pixels wide and runs at 30 fps on the cover, then follows the story clock. Canvas resources and observers are released on unmount. Playback and audio pause offscreen or when the tab is hidden. Reduced-motion mode provides static chapter artwork and manual navigation. If WebGL2 is unavailable, CSS supplies the atmosphere; if Canvas 2D is unavailable, the still artwork, chapter copy and transcript remain usable. Space controls playback (or advances a chapter in manual mode); left/right arrow keys seek. Native range-keyboard interaction is preserved. Fullscreen is offered when the browser supports it.

## Verification

The September refinement passed a full 54-second desktop playthrough with sound, all six chapters, completion and replay. The deliberately capped 30fps artwork recorded a median frame interval of 33.4ms, a 95th percentile of 50ms and a mean of 35.6ms in the verification browser. This is a local browser measurement, not a guarantee for every device. Playback and audio stopped at 54 seconds. Scrubbing, keyboard seeking/playback, fullscreen entry/exit and offscreen audio/playback pausing passed.

All six desktop compositions were captured and visually inspected. At 390px and 320px, all six chapters have no horizontal overflow and retain at least 30.1px and 35.9px, respectively, between copy and controls. Reduced motion keeps the playhead and artwork still, resolves titles immediately and supports manual chapter navigation. A deliberately unavailable Canvas 2D context falls back to the poster, chapter text and transcript. The higher-resolution covers use the same generated artwork as the player.

Homepage image reveals were checked separately at desktop and mobile sizes: a loaded image remained waiting with only 80px (desktop) or 30px (mobile) visible, entered the building state once the new visibility threshold was crossed, and completed normally. Archive and detail images completed correctly. Reduced motion exposed all images immediately. The title, current role link, copyright and spacing were checked in the browser.

TypeScript, focused ESLint and the concept production build pass. Existing build notices remain for the optional CRT renderer bundle and stale Browserslist data. Review at `http://127.0.0.1:8081/practice.html`. Nothing has been deployed.
