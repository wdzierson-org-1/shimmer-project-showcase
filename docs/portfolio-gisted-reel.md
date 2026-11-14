# Gisted walkthrough

Local preview: http://localhost:8080/project/b1a2c3d4-e5f6-7890-abcd-111111111111

The Gisted case opens with a drawn film of the product: ten scenes, 1:25, on one clock. This
replaces the nine-scene sizzle reel built on 2026-11-09. Nothing here is committed or deployed.

To build a film like this for another project, start from `docs/portfolio-walkthrough-playbook.md`.

## What the walkthrough is for

1. **Land the promise in one line.** "Don't just send a link. Send the gist."
2. **Show the real flow, in order**, in about a minute: paste anything, Gisted reads it, your take
   comes first, send it your way, hear back.
3. **Show that enrichment is more than a summary**: key moments, who is mentioned, the catch, and
   suggestions for what to add, on a board that looks like the product's own.
4. **Show the engineering behind the friendly surface.** The enrichment pipeline is the part of
   Gisted with the most invention in it, and the earlier reel showed none of it.
5. **Show it is one product built by one person**: app, back end, pipeline, billing, extension, video.
6. **Leave the viewer wanting to try it.** It is a portfolio piece, so it also has to make the case
   that the person who made it can design and build.

It stays a scripted film rather than a recording: it can pause, seek, jump by chapter, hold a still
for reduced motion, and stay sharp at any size.

## What was holding the earlier cut back

- Every scene was the same move: elements switching from invisible to visible. No cursor, no camera,
  no cuts that meant anything, and hard swaps between scenes.
- The enrichment scene, the heart of the product, read as "cards appear". Nothing showed the work.
- A flat dark background behind every scene.
- The system diagram was visibly broken (nodes missing, lines not meeting them), and emoji stood in
  for the product's line icons.
- The reader scene used a different example (an onboarding plan) from the one being shared.
- The stage was narrower than its own control bar on wide screens.

## The new cut

| | Scene | What happens |
| --- | --- | --- |
| 0:00 | Intro | A bare link sits in a message: delivered, seen, unanswered. Its letters lift off as particles and gather into the Gisted spark above the wordmark. |
| 0:07 | Paste | The real homepage. The link is pasted, Get the gist is pressed, and the camera dives into the video's card. |
| 0:13 | Under the hood | The enrichment pipeline, station by station (below). |
| 0:30 | Findings | Back out of the card. Seven findings and three suggestions land around the video on hand-drawn leaders, at the pace the stream delivers them. |
| 0:37 | Your take | Sam types a take, then adds a suggestion: the thought experiment draws itself as a branching tree. |
| 0:48 | Any content | Six kinds of thing, each with what Gisted adds to it, using the product's own example artwork. |
| 0:54 | Send | Gisted writes the X post, Sam adds a question, Copy post publishes. |
| 1:02 | Hear back | A reader's phone on the left, Sam's feed on the right. She reacts, rates, answers, then starts a gist of her own. |
| 1:11 | The system | The architecture around Supabase, with the path of one gist lit from the app to the model. |
| 1:19 | Outro | The particles gather into the spark again. gisted.co. |

One example runs the whole way through (the quantum immortality video), and one set of particles
does too: they are the pasted link, then the spark, then every word the pipeline reads, then the few
the model keeps, then the system, then the mark again.

### Under the hood

Each station is something `supabase/functions/gisted-enrich` does in the Gisted repository:

| Station | On screen | In the code |
| --- | --- | --- |
| Admission | The link passes a gate: signed ticket, rate limits, budget. | `securityAdmission`, `reserveGeneration` in `index.ts` |
| Read | Two lanes in parallel: the video's details and its 2,214-word transcript. | `readLink` in `read.ts` awaits `readYouTube` and `readSocialEvidence` together |
| Evidence | One document, with `coverage: partial` and the note "Transcript read, visuals not inspected. The page will say so." | `withSocialEvidence` in `read.ts`; `evidenceDocument` in `engineAdapter.ts` |
| Write | Claude sweeps the evidence; seven findings, four sections and three suggestions appear as their JSON closes. | `ObjectScanner` and `EnrichAssembler` in the shared engine's `enrichDocument` |
| Ground | Each mention reaches back for its quote in the source. Five find one; a sixth does not and is dropped. | the `entities` case of `cleanSection` in the engine's `clean.ts` |
| Check | A quality floor, with one bounded repair pass otherwise. | `assessQuality` in `quality.ts`, `streamWithQualityRepair` in `qualityRun.ts` |
| Deliver | The objects leave as server-sent events. | the `sse` wrapper in `index.ts` |

The mention that gets dropped ("Richard Feynman") and the quoted fragments are illustrations of the
rule, not output from a real run; the example video is the product's own fictional one. No timing or
cost figures are shown, because none were measured for this.

## How it is built

- **One clock.** `reel/timeline.ts` holds every scene, caption, camera move and particle formation as
  data and pure functions of time. It imports nothing, so it is tested under node.
- **Scrubbed motion.** Every animated element carries a paused CSS animation whose delay is its start
  minus the scene's clock. The player sets one custom property per scene per frame (`--gr-t`).
  Typed text and counters derive from the same clock through `useAt`.
- **One camera for DOM and WebGL.** The picture is composed at 1280 × 720. Each scene has pan-and-zoom
  keyframes; the DOM gets a transform and the three.js camera gets the matching position, so text
  stays crisp DOM while particles line up with it and show depth as the camera moves.
- **Particles as a function of time.** Positions are computed in the vertex shader from two
  formations and a progress, so seeking is exact. Formations are sampled once from a 2D canvas.
- **The product's own drawing kit.** Line icons, doodles, the wordmark and the drawn covers are
  carried over from the Gisted repository, with its tokens and Inter at weight 800.
- **Without WebGL it still plays.** The spark is drawn as a doodle, the evidence document as ruled
  lines and each object with placeholder lines, over a CSS backdrop.
- **It ends on a real link.** When the film finishes, `gisted.co` on the closing card is an anchor
  laid over the drawn one.

Files: `src/concepts/practice/gisted/reel/` (`timeline.ts`, `clock.ts`, `GistedReel.tsx`,
`particles.ts`, `art.tsx`, `scenes/`, `gisted-reel.css`), `scripts/portfolio/test_gisted_reel.mjs`,
and `public/portfolio/gisted/InterVariable.woff2` with its licence. `GistedProject.tsx` now renders
`GistedReel`. No dependencies were added; three.js was already shared with the SiGuide hero.

## What was checked

- TypeScript: no errors in the reel (the 19 that remain are in `src/components/home/` and
  `src/hooks/useProjectData.tsx`, untouched). ESLint: clean on the reel.
- `npm test`: 76 pass, ten of them new. They cover contiguous scenes, a smooth camera, the dive in
  and out meeting in the same black frame, particles that only cut while invisible, deterministic
  seeking, the pipeline's choreography staying in step, and the numbers shown on screen.
- Production build passes. The case chunk is 24 kB gzipped, its CSS 11 kB, and the particle layer
  5.7 kB on its own. The Inter variable font (352 kB) loads only on this case.
- Headless Chrome, Playwright's WebKit 26 and its Firefox 142: about 200 frames at exact timestamps
  were captured and looked at, across every scene and every scene boundary, from the dev server and
  (in Chrome) from the built site. No console errors or warnings in any of the three engines.
- Live playback at 1440 × 900, 2× density: 60 fps throughout in Chrome (whole film) and WebKit (first
  36 seconds), with no long frames at scene changes.
- Every cursor press and fingertip tap, captured from live playback rather than by seeking, lands on
  its target (see the review below for why that distinction mattered).
- By script: end state and replay, chapter jumps, space and arrow keys, pausing when scrolled away,
  reduced motion (no autoplay, one still per scene, the button steps through), a 390 px phone, a
  short wide window, the fullscreen layout on a wide and a tall screen, and Chrome with WebGL
  switched off.

## Independent review

A second reviewer read the code cold and found two real defects, both fixed, and five smaller ones,
also fixed:

- **The pointer aimed at where its target had been.** It measured a target once, when it set off, so a
  target still scrolling into place (the answer box on the reader's phone) was missed by about 200 px
  in live playback. Seeking re-measured and hid it, which is why the frame captures looked right. It was
  reproduced from live playback, then the pointer was changed to follow its target every frame.
- **Faint rings at the cursor tip** before each click: the ripple's first keyframe is visible, and it
  was being shown ahead of its press.
- A shader `pow` of a negative number (undefined on some GPUs), the WebGL context not being released on
  unmount, a few particles snapping at the end of the sweep, control text below 4.5:1 contrast, and a
  focusable stage with no role or name.

Two more were found by looking closely at 2× captures: a selector that reached into the thumbnail
inside the post preview and broke its drawing, and another that greyed the avatar in the take box.

## What was not

- **Pacing, scene by scene.** During the build only frames, timings and frame rates were inspected,
  not the motion itself. The owner then looked at it on 2026-11-11 and said it was "looking
  excellent". Nobody has gone through the pacing one scene at a time.
- Real Safari and iOS. The WebKit and Gecko engines were tested through Playwright's builds, not the
  shipping browsers, and Firefox was checked by frame only, not for frame rate.
- Real fullscreen: headless Chrome cannot enter it, so its layout was simulated with the same styles.
- A slow GPU or an old phone.
- The live site. This is local only.

## Found afterwards, not changed

- **The pipeline scene's captions go by too fast to read comfortably.** Counting each caption's
  kicker with its sentence, the seven run at 25 to 51 characters a second, and the last is on screen
  for 1.2 seconds. Subtitle guidance tops out at about 20 characters a second. Every other caption
  in the film runs at 11 to 19, except the second one in Hear back, at 24. Fixing it means a longer
  scene or shorter captions, and the length is the owner's call.
- **Seeks from the slider land on a 0.05-second grid**, because that is the slider's step. It is
  fine for a viewer. For checking, the scripts in the playbook lift the step first.
- **Without WebGL, three.js logs three console errors** before the fallback takes over. The film
  still plays.

## Decisions made without the owner

- **Length.** 1:25, up from 1:09, because the pipeline scene is 16.5 seconds.
- **Click to play.** It does not start on its own. The poster keeps the spark moving behind the button.
- **No sound.** The earlier reel looked for `narration.m4a`, which never existed; that hook is gone. A
  narration would need recording against this timeline.
- **The pipeline shows `coverage: partial`** for the video, because that is what the reader records
  when only the transcript was read. It is there on purpose: the system says what it did not look at.
- **A font was added.** `InterVariable.woff2` is self-hosted for the reel so headings can be the
  product's weight 800; the site's Google Fonts link stops at 700.
- **The earlier reel is still in the folder**, unused: `GistedVideo.tsx` and `gisted-video.css`, beside
  the older `GistedSlideshow.tsx`. To go back, point `GistedProject.tsx` at `GistedVideo` again.

## Checking it again

The checks above were scripted with `playwright-core` driving the installed Chrome, from a scratch
folder outside the repository. The method is short enough to repeat: press play, pause, set the
`.gr-track input` range with the native value setter, dispatch `input`, and screenshot `.gr-stage`.
For anything that is measured at run time (the pointers), also capture from live playback.
Playwright's WebKit and Firefox builds were downloaded to `~/Library/Caches/ms-playwright` for this.
