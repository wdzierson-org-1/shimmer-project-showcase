# Editorial portfolio pass

The career reel described below has since been replaced by the animated ASCII story documented in [portfolio-career-arc.md](portfolio-career-arc.md).

The homepage now leads with “Complex ideas. Working products.” and a concise description of Will's hands-on practice. Current role and career narrative follow the supplied executive résumé. The main contact invitation is at the end; repeated project and hero CTAs have been removed.

## Media

Selected work uses edge-to-edge images in their original aspect ratios. Google Beijing uses field research imagery; Agentic OS shows a working multi-application environment. Galleries retain the whole source image, captions, videos, thumbnails, keyboard controls and full-size access. Image dimensions reserve space before loading.

The career film is now a 66-second narrative in three acts: understanding people; making complexity usable; and building what comes next. Eleven scenes connect Smithsonian and Google research with design leadership, DarwinAI, public health, founding Noodle, multimodal AI, Agentic OS, and the current InsideTracker role. On-screen narrative comes from published CMS descriptions and the supplied résumé. Actual Noodle and Agentic OS product-video excerpts are intercut with project imagery and original motion typography. Noodle is dated as historical work; no new quantitative outcome claims are invented.

`public/portfolio/reel/career-reel.mp4` is H.264/AAC, 1280×720 at 24 fps, 66 seconds, approximately 7 MB. Its original synthesized ambient score uses no sampled music, voiceover, or source-video audio. It starts only on request and is muted initially, with an explicit sound toggle, native playback/fullscreen controls, three chapter links, and a text transcript. `chapters.json` records scene timing and editorial copy. `scripts/portfolio/render_reel.py` reproduces it from staged public media in `/tmp/portfolio-media`; Python/Pillow and ffmpeg are required. No connected video-generation service was available, so the film was edited and rendered locally.

The hero now has softly moving sage, peach, blue, and gold washes, fine grain, and contour lines. The atmosphere dissolves with scroll, can be paused, and respects reduced motion. The lead case is the Public Health Company communicable-disease dashboard. All-work thumbnails fill 4:3 frames, with live CMS tags and restrained hover movement; detail galleries preserve uncropped originals. The homepage reserves space for project loading and lead imagery.

## Logos

Fifteen real SVG marks are sourced in `public/portfolio/logos/sources.json`. Wordmark paths are retained; SVG viewboxes are fitted to the actual artwork for consistent optical sizing. Google, Salesforce, Yahoo and IBM come from VectorLogoZone; Included Health, InsideTracker and Optum from their sites; Smithsonian from Logotyp; Bose and Caterpillar from Simple Icons. The additional row includes Obvious Ventures, Lincoln Center, Lockheed Martin, Dr. Seuss, and SoftBank. Obvious, Lincoln Center, Dr. Seuss, and SoftBank assets come from their official websites; the current Lockheed Martin vector comes from Wikimedia with attribution to the company. Used to identify past teams and clients. Links lead to matching published work or résumé-based experience. A brand's appearance does not imply that every engagement was full-time employment.

## Writing and profile links

The writing section links directly to the three Medium articles supplied by Will. LinkedIn and Medium profile links appear in the footer. The small Lovable feature link was verified against its published “11 UX Portfolio Examples” guide, which includes Will in section 5. The page does not have an anchor ID on that heading, so the link targets the article itself.

## Original terminal

`src/concepts/os/original/CRTHero.tsx` is copied from Will's newer portfolio checkout at `/Users/will/Appdev/shimmer_new/shimmer-project-showcase/src/components/home/CRTHero.tsx`, together with terminal link utilities, prompt routing, persona context and knowledge. It retains real xterm input, SerializeAddon session persistence, boot sequence, typewriter responses, command history, link hit testing, ghost prompts, original steel-blue phosphor settings, and the original virtual-canvas/bezel crop math.

Adaptations: window-relative layout; readable scale floor on small screens; local project navigation; isolated session storage keys; current-role/Noodle status corrections; motion preference handling; cancellation on unmount; and GPU resource recreation on window resize while preserving xterm state. Prompt analytics are not copied. Existing Supabase LLM and RAG services are reused. The separate OS concept retains its previous terminal.

## Scrolling and verification

Lenis 1.3.26 provides wheel smoothing. Native touch scrolling and reduced-motion behavior remain available. Terminal interactions opt out of Lenis. Route changes reset scroll; page section links use Lenis positioning.

Playwright verified the new desktop and mobile layouts, all 15 logos, 21 live projects with tags, archive search, the three-image public-health gallery, 66-second film playback, sound toggling, chapter seeking, transcript access, hero pausing and scroll fade, and reduced-motion animation/Lenis cleanup. Medium, LinkedIn, and Lovable destinations were inspected. No horizontal overflow was found at 390px or 1440px. Screenshots are in `.playwright-mcp/narrative-*`, `all-work-bleed-loaded.png`, and `phc-feature.png`.

The terminal was also reopened and closed successfully after the atmosphere changes. The prior pass additionally verified original-terminal keyboard input and a live Project Ariadne answer, session restore, window resize/maximize/close, and gallery keyboard/swipe interactions. TypeScript, ESLint, and the concept production build pass. Existing build notices remain for the large optional CRT renderer bundle and an old Browserslist database.

No CMS records or production deployment were changed.
