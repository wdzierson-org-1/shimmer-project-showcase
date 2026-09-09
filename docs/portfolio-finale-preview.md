# Pearly particles and an open-ended finale — local preview

This continues the unpublished wearables/robotics preview on `preview-wearables-robotics`. The user asked to review before publishing. Production remains at `20ca91e`; do not push or deploy these changes without approval.

The working source is `/private/tmp/shimmer-dusk-fireflies`. Review at http://127.0.0.1:8083/.

- All sculpture particles, connecting signals, ambient fireflies, and the opening cover use the same pearly white. Lighting still gives the surfaces depth, but there is no yellow sweep or chapter color transition. The lavender landscape is preserved.
- “An idea worth building” (36–45s) now shows three separate records feeding a larger conversation, tying the visual to the Noodle companion described in the copy.
- “What comes next?” (45–54s) passes through a connected planet, a double helix, and an interwoven network. Five question marks gather by roughly 51 seconds, hold, and dissipate from 52.15 seconds until the score ends. These are conceptual glimpses, not claims about current AI capabilities.
- WebGL and Canvas 2D share a deterministic timeline for seeking and replay. Reduced motion presents a stable interconnected network instead of the rapid finale. The existing 54-second audio and story text remain intact.

Validation: TypeScript, focused ESLint, production build, and four timeline tests (assembly/holds, final dissolution, seeking/replay, reduced motion). Native projections of the sampled geometry were inspected for legibility and composition; all five assembled forms fit desktop and 320px mobile camera frames. These projections are not browser screenshots; their question-mark font mask uses the local Georgia font through Pillow. The connected browser is unavailable, so full browser playback remains a review step. Local Vite responds successfully.

Tests: `node --test scripts/portfolio/test_journey_sequence.mjs`.
