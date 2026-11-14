# Stash walkthrough

Local preview: http://localhost:8080/project/f0163fc8-9e6a-4970-a2e0-b420a208402f

The Stash case opens with a drawn film of the product: nine scenes, 1:28, on one clock. It replaces
the six-slide slideshow from 2026-11-09, which was built on Stash's earlier design. Built on
2026-11-13 by the method in `docs/portfolio-walkthrough-playbook.md`. Nothing here is committed or
deployed.

## What it was built from

- **The product's source:** `/Users/will/Documents/ChatGPT/Stash/worktrees/fair-enrichment-assessments`
  (branch `codex/fair-enrichment-assessments`, last commit 2026-11-06, the newest of the checkouts in
  that folder). Read only; no `.env` file was opened.
- **The design:** that checkout's `DESIGN-v2.md`, "clean objects, DIY machinery": paper, true black
  ink and one spot colour (lime); PP Neue Montreal for the person's things; Departure Mono for what
  the machine says; square machine windows, near-square object cards.
- **The live site,** https://gostash.it, captured on 2026-11-13: its copy, its example saves and its
  own enrichment demo (`public/site/js/enrich.js`), whose choreography the Enriched scene follows.

## What the walkthrough is for

1. **Land the promise in one line.** "Save it fast. Find it when you need it."
2. **Show the real flow, in order:** save from the share sheet, the card is there at once, Stash reads
   it in the background, find it later in your own words, use it inside your AI.
3. **Show that a save becomes more than a bookmark:** what it is, what is in it, who made it, the
   words on screen, a summary.
4. **Show the engineering behind it.** What happens between "saved" and "findable by meaning", each
   step tied to the code, including what the code says it did not look at.
5. **Show the breadth:** any kind of thing, and four surfaces (iPhone, Chrome, the web, your AI).
6. **Look like Stash.** The film is made of the product's own type, colours, textures and motion.
7. **Leave the viewer wanting to try it,** and end on a real link.

## What held the earlier one back

- It was six captioned screenshots on a timer: nothing acted, and nothing was explained.
- The screenshots and its notes were of the earlier design (violet, tinted cards).
- Its copy made claims nobody had checked ("forty edge functions", a macOS menubar app, Electron).

## The cut

| | Scene | Ground | What happens |
| --- | --- | --- | --- |
| 0:00 | Intro | lime | Black tags pile up, each a thing saved under a useless name. "You saved it. Somewhere." They sink into the halftone pool, and the promise lands. |
| 0:07 | Save | paper | On an iPhone a TikTok is shared to Stash in two taps. The card prints into the library at once, its picture unresolved, tagged "gathering more info". |
| 0:16 | Under the hood | black | The pipeline, station by station (below). |
| 0:37 | Enriched | paper | The picture resolves from pixels, the title decrypts, and five windows land around the card on leaders, then "find it by". |
| 0:46 | Anything | paper | Six more saves print in, each read its own way: a screenshot, a voice note, a paper, a repo, an article, a book cover. |
| 0:54 | Find it | paper | Three weeks later, a question typed into Ask Stash. Three rankings fill, the answer streams, and the library narrows to the card. |
| 1:03 | In your AI | paper | In Claude, with Stash connected, a shopping list is made from the saved video through `search_stash`. |
| 1:13 | The system | black | The architecture: four surfaces reach Supabase through its edge functions. The path of one save is lit, from the phone to an edge function, then to the database and the models. |
| 1:22 | Outro | lime | "Stash is smarter saving." The wordmark assembles from halftone dots. gostash.it. |

One example runs the whole way through: the tomato and mozzarella pasta video, which is the site's
own first example. The ground changes between lime, paper and black by a halftone wipe, and one
set of dots runs through the film: the saved link, the words recovered from it, the evidence, the
chunks, the vectors, the system, and at the end the wordmark.

### Under the hood: what is on screen, and where it is in the code

Paths are in the Stash checkout, under `supabase/functions/`.

| Station | On screen | In the code |
| --- | --- | --- |
| Save | "capture → add-url"; "signed in", "subscription not lapsed", "a video link", "row inserted · status: pending", then "saved. you keep going." | The iPhone posts to `capture/index.ts`, which forwards to `add-url/index.ts`: `auth.getUser`, `requireEntitlement` (`_shared/entitlementGate.ts`), `resolveTikTokLink`, `classifyLinkFlavor`, the insert with `attributes.enrichment.status: 'pending'`; the rest runs in `EdgeRuntime.waitUntil` (`enrichAfterResponse`) |
| Read | "what was said" fills; "under 400 characters → read one cover image"; the cover resolves; "the words on it" | `extractTikTokSource` in `_shared/pageExtraction.ts`: transcript from SearchApi, and one cover image read when the transcript is under 400 characters |
| Evidence | speech recovered, cover image 1 read, other visuals not inspected; the quoted sentence | The coverage string is the code's own, from `_shared/tiktokCandidate.ts` |
| Write | draft `gpt-4.1`, review `gpt-5-mini`; the title decrypts on a card | `prepareTikTokCandidate`; model constants in `_shared/socialPresentation.ts` |
| Index | `apply_enrichment_patch`, compare-and-swap, "your own note and edits are left untouched"; chunks of up to 1,200 characters; `text-embedding-3-small`; "1,536 numbers each, stored with pgvector" | `applyCandidate` and `chunkSearchText` in `_shared/enrichmentStore.ts`; `rebuildItemIndex` in `_shared/enrichmentIndex.ts`; the `embeddings` table is `vector(1536)` |
| Settle | transcript, title, description, preview, index tick; "status: complete"; "anything missing → status: partial" | `set_item_enrichment`; a TikTok save is complete only when those five pass |
| Afterwards | "your card updates live"; "every 5 min: facts, each quoted from the source"; "hourly: assess what fell short, for repair" | Supabase Realtime; `object-intelligence-worker` (pg_cron, every 5 minutes; each fact must quote the source); `runEnrichmentMaintenance` (hourly; repairs run only where a flag and an allowlist permit) |

Other claims:

| Claim | Source |
| --- | --- |
| Ask searches "by meaning, by words and by your own notes" | `searchItems` in `_shared/search.ts` and the `hybrid_search_content` function: rank fusion over vector distance, full-text search, and full-text search of the owner's notes |
| "searched your stash · 1 save", the answer cites the card | `chat-with-all-content`: a tool loop over `search_stash`, `browse_catalog` and `get_item` that ends with cited sources |
| `search_stash`, read-only, "you approve each app" | `mcp/index.ts`: every tool has `readOnlyHint: true`; `_shared/agentAuth.ts` requires an OAuth token and an `agent_grants` row for that app |
| The system's nodes | iOS app and share extension (`ios/`, posting to `capture`), Chrome extension (`extension/`, Manifest V3), web app (React, Vite, Vercel), MCP (`mcp/`), Supabase (Postgres, pgvector, Storage, Auth, Realtime), edge functions, pg_cron workers, Firecrawl, SearchApi and Mapbox, OpenAI models, Stripe |
| "$4.99 a month", "Works with …" | gostash.it |

**What is illustrative, not real output:** the video, its creator and everything Stash says about
it are the site's sample content. The ingredients list arrives in the product from the five-minute
worker, later than the film's card shows it; the film notes "each fact quoted from the source"
beside it. The four chunks and the 23 cells per vector are a drawing: a 58-second video's text would
be one or two chunks, and a real vector has 1,536 numbers. "coverage: partial" on the evidence
window is read off the engine's rule that only a complete carousel counts as full; the sentence
quoted under it is verbatim. No timings or costs are shown.

**A limit on all of the above:** the repository's own notes say production carries changes that are
not in this checkout. The film shows what this checkout does.

## How it is built

The engine is the Gisted film's, copied and renamed (prefix `sx`), as the playbook's section 11
describes: one clock, scrubbed CSS animations, a shared camera for DOM and WebGL, a pointer that
measures its targets every frame. What is new here:

- **Three grounds.** Each scene names its ground (lime, paper, black). The WebGL layer draws it and
  wipes to the next with halftone dots; without WebGL the stage's background colour does the job.
- **A light stage.** Dots are drawn with ordinary blending, in ink on lime and in lime on black.
- **Stash's own motion, as functions of time:** the turning cursor, text that decrypts, pictures that
  resolve from pixels (26 → 18 → 12, then 8 → 5 → 3 → 1 on the product's 110 ms beat), and machine
  elements that print in steps.
- **The wordmark in halftone:** the ST4SH paths are rasterised once and sampled on a hexagonal grid.

Files: `src/concepts/practice/stash/reel/` (`timeline.ts`, `clock.ts`, `StashReel.tsx`, `art.tsx`,
`kit.ts`, `particles.ts`, `scenes/`, `stash-reel.css`), `scripts/portfolio/test_stash_reel.mjs`, and
`public/portfolio/stash/film/` (fonts, licences and the site's example pictures).
`StashProject.tsx` now renders `StashReel`. No dependencies were added.

## Decisions made without the owner

- **Which checkout.** `fair-enrichment-assessments`, as the newest.
- **A walkthrough of the product,** not the story of its design.
- **Length.** 1:28. The pipeline scene is 21.5 seconds, a quarter of the film, sized so that its five
  captions can be read.
- **Lime, not violet.** The design doc leaves the spot colour open; the live site uses lime.
- **PP Neue Montreal is copied into this site** (`public/portfolio/stash/film/`, four weights, 334 kB,
  loaded only on this case). It is a commercial typeface licensed for Stash. Whether that licence
  covers this portfolio's domain is the owner's to confirm **before deploying**. If it does not,
  change `--sans` in `stash-reel.css` and delete the four files. Departure Mono and JetBrains Mono
  are under the SIL Open Font License, and their licences sit beside them.
- **The site's example pictures are copied in** (four files, 600 kB). The product's notes say its
  photographs are from Unsplash.
- **Claude is drawn as itself,** as the site draws it, with the model label left off. Other
  assistants appear by name only.
- **No claim about who built it.** The system scene says "one product on four surfaces".
- **"make into" is left out.** The site shows it as a beta; it was not found in the app's code.
- **The macOS app is left out:** it lives in another repository that was not read.
- **Click to play, no sound,** as for Gisted.
- **The slideshow is still in the folder,** unused: `StashSlideshow.tsx`, `story.ts`, `stash.css`. To go
  back, point `StashProject.tsx` at `StashSlideshow` again.

## What was checked

- `node --test scripts/portfolio/test_stash_reel.mjs`: 13 pass. They cover contiguous scenes, caption
  reading rate (none above 20 characters a second, kicker included), a smooth camera, the ground only
  changing by a complete wipe, dots that only cut while invisible, the pipeline's order, the system
  graph and the order of its trace, a scan for the lost-inline-style mistake, and that every scene
  exits by its last frame.
- TypeScript adds no errors (the 19 that remain are the repository's own). ESLint is clean. A
  production build passes.
- Frames at exact times across every scene and boundary, in Chrome, Playwright's WebKit and Firefox.
- Every press from live playback. A real-time run: 60 fps throughout, with end, replay, chapters,
  keys and off-screen pause behaving.
- Reduced motion, a 390 px phone, a short wide window, the fullscreen layout (simulated) on a wide
  and a narrow screen, and Chrome with WebGL off.
- The built site, served from a scratch folder.

## Independent review

A second reviewer read the code cold and checked the film's claims against Stash's source. It
confirmed the 400-character rule, the coverage sentence, both model names, the chunk size and the
1,536 dimensions, the patch's protection of the owner's fields, the five checks, the two timers, the
MCP tools and the three-way search. It found thirteen things; all were fixed except the two noted
below.

- **The system diagram had a save going to the database before an edge function.** The phone posts
  to `capture`, which forwards to `add-url`, which inserts the row. The diagram was redrawn so every
  surface reaches Supabase through its edge functions, and a test now holds the order.
- **Three wordings overstated:** "subscription active" (the gate only refuses lapsed ones), "one tap"
  (the scene shows two), and "hourly: assess, and repair" (repair is behind a flag and an allowlist).
- **The pipeline's rail of step names never exited** and cut off at the scene's end.
- **Fullscreen on a narrow screen** put the caption beside the picture and squeezed it to a sliver.
- The keyboard focus ring was hidden under the WebGL canvas; with reduced motion the closing link
  never appeared; small green ticks and two greys were under 4.5:1; one selector reached into a
  nested span; about thirty unused rules and three unused pictures were removed; four tests were
  asserting less than their names said.

Left as they are:

- **Reduced motion shows one still per scene,** so four of the pipeline's five stations are reachable
  only with the arrow keys or the transcript.
- **Four chunks is a drawing.** For this short video the real index would probably hold one.

## What was not

- Nobody has watched it. Only frames, timings and frame rates were inspected.
- Real Safari and iOS, real fullscreen, a slow GPU, the deployed site.
- Whether production Stash matches this checkout.

## 2026-11-14: moved onto the CMS entry

At the owner's request the film now opens the existing CMS Stash case (`f0163fc8-9e6a-4970-a2e0-b420a208402f`), above its gallery of product videos. The local-only duplicate entry (`c2b3d4e5-…`) was removed from `projects.ts` and from the unapplied migration. No database rows were changed.
