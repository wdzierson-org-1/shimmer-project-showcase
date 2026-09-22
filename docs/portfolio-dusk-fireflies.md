# Still asking why — dusk and fireflies

The six-chapter journey now sits over an abstract evening landscape: a blush horizon, lavender distance, muted blue hills, and a deep plum foreground. The left side and mobile copy area have a darker scrim for legibility. Hills are local SVG paths, with no photographic background or generated asset.

The detailed particle treatment from `865c9af` is restored: dense, shaded glyph surfaces gather through ordered transitions, with continuous contour lines and traveling highlights. This restores the fine spiral ribs, mobile globe, heart, and connected knowledge structure. Roughly 2.4% of surface particles become warm firefly highlights; the rest retain their fine texture and volume. Surrounding fireflies continue drifting independently. The cover has a denser vector question mark with fine orbital paths, and the Canvas 2D fallback keeps its detailed surface in the evening palette.

The lavender landscape now includes broad cloud texture, a varied color wash on each ridge, fine curved lines clipped to the slopes, soft rim light, and a subtle grain layer. Three slow sheets of mist separate the hills. SVG textures remain static; the mist uses one cached sprite and follows the playback clock. The landscape remains conceptual, with the original silhouettes and text contrast preserved.

The surrounding fireflies follow the player clock after Play. Before playback, the cover atmosphere runs only while visible, unless paused or reduced motion is enabled. Both renderers are bounded at 30 fps; background sprites are cached. The earlier formation counts of 22,000 desktop and 10,500 mobile particles are restored, alongside 48 finely sampled contours and 118/62 surrounding lights. No new package dependencies were added. The scene remains lazy-loaded after Play.

Implementation is in `/private/tmp/shimmer-dusk-fireflies`, based on the newer journey commit `865c9af`. It also includes the previously prepared prompt-recording fix. The original workspace contains an older portfolio prototype and remains intact.

The user reviewed the local preview at http://127.0.0.1:8083/ and approved the refined version for production. The refinement passes TypeScript, focused ESLint, and the production build. The 22 existing regression tests passed before this visual-only refinement. Automated browser visual and runtime verification could not be performed because the browser connection is unavailable. Release uses the existing `main` branch and Vercel project documented in `portfolio-production.md`; no database migration or Edge Function deployment is required.


## Production release verified

The user approved publication. Commit `20ca91e` is on remote `main`, including the refined dusk scene, restored detailed particle formations, and Ask AI/floating-terminal prompt recording in `public.user_prompts`.

Vercel deployment `dpl_2D9jegMrccqyzz4A5R84ocmZK7su` (`shimmer-project-showcase-mwwmzj9tm-wdzierson-s-team.vercel.app`) is Ready and assigned to `dzierson.com` and `www.dzierson.com`. Both domains resolve successfully. SHA-256 checks of six live assets confirmed that the entry, main application, styles, JourneyScene, prompt-tracking service, and terminal match the approved local production build. This verifies delivery of the approved assets; automated browser playback verification remained unavailable.

Continue development from the latest remote main or `/private/tmp/shimmer-dusk-fireflies`. The original workspace's older uncommitted prototype has been preserved.
