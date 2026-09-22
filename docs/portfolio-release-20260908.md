# Production release — September 8, 2026

The approved portfolio was integrated with the latest remote main branch in a clean checkout at `/private/tmp/shimmer-production-release`, preserving this workspace's earlier uncommitted changes.

Repository: https://github.com/wdzierson-org-1/shimmer-project-showcase

Release commits on `main`:

- `3e2fb90` — approved portfolio, career reel, interactive dashboard, original terminal, production entry routing, and streaming chat handler.
- `43a76b8` — canonical citation URLs and live streaming verification.

Vercel project: `wdzierson-s-team/shimmer-project-showcase`; domains `dzierson.com` and `www.dzierson.com`. The normal production build now loads the portfolio at `/` and preserves CMS/authentication/content routes in the existing application. See `docs/portfolio-production.md` on the remote main branch for build, routing, verification, and rollback details.

Production deployment `dpl_EQ8sXWbYYMhumEhBzazBuDMzFs5W` (`shimmer-project-showcase-h77rz60x9-wdzierson-s-team.vercel.app`) reached Ready and received both domains. Live browser checks confirmed HTTP 200, the new dashboard title and GM asset, 21 projects, case galleries, existing project URLs, mobile layout, and SSE answers with validated source cards. The existing apex-to-www redirect remains in place.

The `chat` function in Supabase project `uilvozcryifnpldfpwiz` was deployed with opt-in SSE streaming and the previous JSON response format intact. Live checks confirmed incremental text, a valid Google Beijing citation, and the legacy `{ generatedText }` response. No database migrations or CMS content writes were performed.

This original workspace still contains the preview files and earlier local edits. It was not reset or rebased. Future changes should start from the released remote main branch, or carefully reconcile this workspace with it; do not overwrite the newer production code with the older local application files.

## Project-order follow-up

Commit `d502eef` is now on remote `main`. It makes the public archive and unified admin list share `display_order`, removes the obsolete featured UI, validates asynchronous reorder saves, and refreshes public data when a tab regains focus. The clean checkout is on branch `fix-project-order-insidetracker` at this commit.

Vercel deployment `dpl_Hjz5u66ye9UePSYrUuJFXTJ5Vi8t` (`shimmer-project-showcase-2zdcdazyr-wdzierson-s-team.vercel.app`) reached Ready and received both production domains. Live Playwright verification confirmed HTTP 200, 22 projects with InsideTracker first, the corrected query order, all ten new captions, and no page errors. Controlled browser tests also verified admin keyboard dragging, save persistence, search, save failure recovery, and tab-focus refresh. Focused TypeScript, ESLint, 17 Node tests, and the production build passed.

The ten captions for project `8d229fec-f5fb-41b2-9add-b6303536872c` were saved through the authenticated Supabase API after individual image inspection. Only previously empty caption fields changed; image URLs, sequence, and other fields were checked against the original records. No project positions or schema were changed. The committed `docs/portfolio-insidetracker-captions.json` records the exact captions; `docs/portfolio-project-order.md` describes the fix and validation.

## Homepage and career story follow-up

Commit `865c9af` is now on remote `main`. The clean checkout is on branch `refine-homepage-narrative`. It updates the four requested project headlines, swaps Noodle for Optum in the homepage features, and introduces a continuous Three.js glyph field for the career story. The six chapters connect curiosity, craft, mobile work, healthcare, founding Noodle, and building and writing about AI. The original ASCII renderer remains the WebGL fallback. Source and attribution details are in `docs/portfolio-journey-field.md` on main.

Vercel deployment `dpl_5DCoSrPLfvihDZPtE8rZnjNWHAQU` (`shimmer-project-showcase-j9apxwiwy-wdzierson-s-team.vercel.app`) reached Ready with both production domains. Live Playwright checks confirmed the requested headlines, Noodle link, new WebGL story, and all 22 archive projects including Optum, with no page errors. Local production checks covered every chapter, identical paused canvas frames, seeking/replay, 320px and 390px layouts, reduced motion, and the canvas fallback with WebGL disabled. TypeScript, focused ESLint, all 17 existing regressions, and the production build passed. No database content changed in this follow-up.


## Production release verified

The user approved publication. Commit `20ca91e` is on remote `main`, including the refined dusk scene, restored detailed particle formations, and Ask AI/floating-terminal prompt recording in `public.user_prompts`.

Vercel deployment `dpl_2D9jegMrccqyzz4A5R84ocmZK7su` (`shimmer-project-showcase-mwwmzj9tm-wdzierson-s-team.vercel.app`) is Ready and assigned to `dzierson.com` and `www.dzierson.com`. Both domains resolve successfully. SHA-256 checks of six live assets confirmed that the entry, main application, styles, JourneyScene, prompt-tracking service, and terminal match the approved local production build. This verifies delivery of the approved assets; automated browser playback verification remained unavailable.

Continue development from the latest remote main or `/private/tmp/shimmer-dusk-fireflies`. The original workspace's older uncommitted prototype has been preserved.
