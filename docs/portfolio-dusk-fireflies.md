# Still asking why — dusk and fireflies

The six-chapter journey now sits over an abstract evening landscape: a blush horizon, lavender distance, muted blue hills, and a deep plum foreground. The left side and mobile copy area have a darker scrim for legibility. Hills are local SVG paths, with no photographic background or generated asset.

Warm, softly glowing fireflies replace the glyph particles. Most gather into the existing question, spiral, mobile globe, heart, knowledge network, and final horizon; some continue drifting around the formations. Each light has a slow, individual pulse and a small wandering motion. Sparse points replace the continuous contour lines. The cover has a vector firefly question mark, and the Canvas 2D fallback uses the same palette and glow treatment.

The surrounding fireflies follow the player clock after Play. Before playback, the cover atmosphere runs only while visible, unless paused or reduced motion is enabled. Both renderers are bounded at 30 fps; background sprites are cached. Main formation counts are 5,600 on desktop and 2,700 on mobile, plus 1,920 contour points and 118/62 surrounding lights. No new package dependencies were added. The scene remains lazy-loaded after Play.

Implementation is in `/private/tmp/shimmer-dusk-fireflies`, based on the newer journey commit `865c9af`. It also includes the previously prepared prompt-recording fix. The original workspace contains an older portfolio prototype and remains intact.

Local review: http://127.0.0.1:8083/ — play “Still asking why.” TypeScript, focused ESLint, the production build, and existing regression tests pass. Browser visual and runtime verification could not be performed because the browser connection is unavailable. This version has not been published or deployed.
