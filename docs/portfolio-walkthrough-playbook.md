---
name: building-drawn-product-walkthroughs
description: Use when asked to create, rebuild or improve an animated product walkthrough, demo reel, sizzle reel, explainer or in-browser "video" for a project (a portfolio case, landing page or docs), especially when an existing one feels flat or like a slideshow, when a pipeline or system has to be shown as an animation, or when three.js or WebGL visual interest is wanted.
---

# Building a drawn product walkthrough

A playbook for making a product walkthrough that is drawn in the browser rather than recorded: DOM, CSS and one WebGL layer, all driven by a single clock. It holds what was learned rebuilding the Gisted walkthrough on 2026-11-11, and is written for an agent who has to make the next one, for a different project, with none of that context.

| | |
| --- | --- |
| Reference implementation | `src/concepts/practice/gisted/reel/` in `/Users/will/Appdev/shimmer-project-showcase`: 3,008 lines, plus a 182-line test |
| See it run | `npm run dev`, open `http://localhost:8080/project/b1a2c3d4-e5f6-7890-abcd-111111111111`, press **Play the walkthrough** |
| Its own record | `docs/portfolio-gisted-reel.md`: goals, scene list, pipeline-to-code table, what was and was not checked |
| The product it shows | `/Users/will/Appdev/gisted` (read only; never open its `.env*` files) |
| What came out | Ten scenes, 1:25, no new dependencies, built in one session of about 80 minutes. A steady 60 fps in headless Chrome for the whole film, and in WebKit for the 36 seconds measured. |
| The owner's verdict | Before: "fine, but it's not quite there." After: "this is looking excellent." |

**How to use this.** Read "The short version" now. Read sections 1 to 3 and 12 before designing anything, 4 to 8 while building, 9 before saying it works, and 10 when something looks wrong. Section 11 has tested steps for starting from the Gisted code. Words used in a particular sense (scrubbed, canvas, stage, spot, formation) are in the glossary near the end.

**How far to trust it.** This comes from one film, for one product, approved by its owner after one look. The architecture, the mistakes and the checks are solid ground. The scene lengths and timings in §2.2 and §5.4 are what shipped, not values anyone tuned, and §13 lists what is known to be weak. Everything here was built on a dark stage, for a web app whose source could be read.

Contents: [1 The bar](#1-the-bar) · [2 What goes in the film](#2-what-goes-in-the-film) · [3 Read the product first](#3-read-the-product-first) · [4 How it is built](#4-how-it-is-built) · [5 Scene patterns](#5-scene-patterns) · [6 The WebGL layer](#6-the-webgl-layer) · [7 The player](#7-the-player) · [8 Living inside a host site](#8-living-inside-a-host-site) · [9 Checking it](#9-checking-it) · [10 Mistakes made here](#10-mistakes-made-here) · [11 Reusing the Gisted code](#11-reusing-the-gisted-code) · [12 Decisions that belong to the owner](#12-decisions-that-belong-to-the-owner) · [13 Known gaps](#13-known-gaps-in-the-reference) · [The second film](#what-the-second-film-added) · [Done means](#done-means) · [Glossary](#glossary) · [Appendices](#appendix-a-the-checking-scripts)

## The short version

**What you are building.** A film whose every frame is computed from one number, the time. That is what lets it pause, seek, jump by chapter, hold a still for reduced motion and stay sharp at any size. It is also what lets an agent, who cannot watch video, check it frame by frame.

**Five rules that carried the result**

1. **Goals before scenes.** Write five or six goals in a repository note first. Every scene serves one. (§2.1)
2. **One clock, no timers.** Story motion never uses `setTimeout` or state that depends on having played through. An ordinary CSS transition is allowed only for state feedback of 0.3 s or less, such as a focus ring. (§4)
3. **Show the product working, and the work happening.** A cursor that clicks and types in a faithful copy of the real screens, plus one scene inside the machinery. Results that merely appear read as a slideshow. (§1, §2)
4. **Every claim traces to code or a measured number.** Keep a table of on-screen claim to source. Invent no timings, costs or counts. (§2.5)
5. **Seeking is not watching.** Check exact frames by seeking, then check everything measured at run time from live playback, then get a cold review, then ask a person to watch. (§9)

**Order of work**

1. Find the product's source and read it (§3), along with the existing walkthrough if there is one.
2. Write the goals and what holds the current cut back. Put the decisions in §12 to the owner. If you cannot ask, make them and list them in your report as theirs to overrule.
3. Write the timeline's skeleton as data: the scene list, durations, captions and alt text. Test it under node (§4.1). Camera keys and stills come with each scene, from its rendered layout.
4. Get a player and one scene of your own on screen before writing the others. §11 has tested steps for doing that from the Gisted code. The reference build wrote all ten scenes first, and one systematic mistake was repeated 18 times before anyone saw it (§10, first row).
5. Build the remaining scenes, looking at frames after each.
6. If the film is to have a WebGL layer (§12), add it last, as a function of the same clock, with a fallback for when it is missing (§6).
7. Run every check in §9: live playback, other engines, and the modes.
8. Give the code to an independent reviewer (Appendix C). Fix what it finds and re-check from live playback.
9. Record goals, claims-to-code, what was checked and what was not. Report, and ask the owner to watch it.

The reference build spent roughly 45 minutes reaching the first frame, 15 on visual iteration, and 20 on checks, review and fixes.

## 1. The bar

The owner's brief for the rebuild, in their words: the earlier cut was "fine, but it's not quite there. the animation is not quite good enough, and it lacks a certain excitement about the overall app." They asked for "a more interesting/exciting animation related to the enrichment pipeline", "additional visual interest using something like threejs", and "a compelling look at an exciting, useful app". They also asked for the goals of the demo to be written down.

### What "fine, but not quite there" looked like

The earlier cut is still in the folder, unused, at `src/concepts/practice/gisted/GistedVideo.tsx`. It is the baseline to avoid.

| In the earlier cut | Why it fell flat |
| --- | --- |
| Every scene was the same move: things switched from invisible to visible. | Nothing acts, so nothing is being demonstrated. |
| No cursor and no camera. | The viewer is never told where to look or what was just done. |
| One scene mounted at a time, swapped with a hard cut. | No continuity; it reads as slides. |
| Enrichment, the heart of the product, was "cards appear". | The impressive part was shown as a result, with none of the work. |
| A flat dark background behind everything. | No depth and no atmosphere. |
| Emoji stood in for the product's line icons. The system diagram had nodes missing and lines that did not meet them. | It did not look like the product, and a visible defect undercuts a claim of craft. |
| The reader scene used a different example from the one being shared. | The story broke in the middle. |
| The stage was narrower than its own control bar on wide screens. | Another visible defect. |
| React state was set on every frame, and more than forty threshold tests on scene time switched classes and content, starting 32 CSS transitions that then ran in their own time. | A paused or sought frame depended on how it was reached, so it could not be checked by seeking. |

### The moves that changed the reaction

1. **Something acts in every product scene.** A cursor glides, presses and types; on the reader's phone it is a fingertip. The screen responds at the instant of the press.
2. **The camera directs.** It pushes in on the thing being touched, holds, and pulls back for the result.
3. **One scene goes inside the machinery.** The click that starts enrichment becomes a dive into the content card; 16.5 seconds later the camera comes back out of the same card with the findings. That scene is the answer to "more exciting animation of the pipeline".
4. **One visual thread runs through the whole film.** The same 4,800 particles are the pasted link, then the logo mark, then every word the pipeline reads, then the few the model keeps, then the system diagram, then the mark again.
5. **One example and one cast, start to finish.** The same video, the same sender (Sam), the same reader (Maya).
6. **It is made of the product's own materials, and keeps their rules.** Its icons, doodles, wordmark, colors, typeface, copy and example content. Gisted's design doc allows its magenta only as hand-drawn line and icon strokes, never as a fill or as text. Inside the app windows the film keeps to that, apart from a half-second highlight on the pasted link. The dark stage and the captions are the film's own, and use magenta as light.
7. **Results arrive at the pace of the real thing.** Ten findings land one by one, 0.36 s apart, each on a hand-drawn line, because the product streams them.
8. **Two kinds of scene alternate.** Some show the app in a window. The others have no window: large type on the dark backdrop, with the WebGL layer in full view. The dark backdrop is the film's own choice, made so that a light app and bright particles both stand out against it.
9. **It ends on a real action.** The address on the closing card becomes a working link.

## 2. What goes in the film

### 2.1 Goals first

Write them into a repository note before designing scenes, and treat the note as part of the deliverable. For Gisted the owner asked for it outright. Gisted's six, which generalize well:

1. **Land the promise in one line.** ("Don't just send a link. Send the gist.")
2. **Show the real flow, in order**, in about a minute.
3. **Show what makes it more than the obvious version.** (Enrichment is more than a summary.)
4. **Show the engineering behind the friendly surface.** (The pipeline.)
5. **Show who built it and how much of it.** (One person, end to end.)
6. **Leave the viewer wanting to try it.**

### 2.2 The arc that shipped

This is the one arc that has been tried. The owner approved it on one viewing, and nobody has tuned it scene by scene.

| # | Role | Gisted scene | Seconds | What moves |
| --- | --- | --- | --- | --- |
| 1 | Hook: the viewer's problem, then the promise | Intro | 7.0 | Kinetic type. A link in a message goes from "Delivered" to "Seen" and gets no answer. Its letters lift off as particles and gather into the logo mark. |
| 2 | First action in the real product | Paste | 6.5 | The cursor pastes and presses the button; the camera pushes in on the composer, then dives into the content card. |
| 3 | Under the hood | Under the hood | 16.5 | The camera travels left to right along a 2,700 px pipeline. The particles are the words being read. |
| 4 | Payoff | Findings | 7.6 | Back out of the card. Ten result cards land on hand-drawn leader lines. |
| 5 | Make it yours | Your take | 10.4 | The cursor types a line and adds a suggestion; a diagram draws itself. |
| 6 | Breadth | Any content | 6.5 | Six cards are dealt in; each lifts in turn. |
| 7 | Ship it | Send | 7.5 | A tab click, the post streams in, publish, and the window flies off in 3D. |
| 8 | The loop closes | Hear back | 9.5 | A reader's phone on the left, the sender's feed filling on the right. |
| 9 | The system | The system | 8.0 | The architecture diagram grows outward from its hub; the path of one request lights up. |
| 10 | Close | Outro | 6.0 | The particles gather into the mark again; wordmark, line, link. |

What to take from it:

- Open on the viewer's problem, not on the product.
- Have the product doing something within ten seconds. Here the first click is at 0:08.6.
- Put "how it works" early, straight after the first action, as the answer to "what is it doing?". Enter and leave it through the same door (the content card).
- The under-the-hood scene takes 19% of the runtime, and every other scene 7 to 12%. Even so it was too short for its seven captions (§13): give yours more room, or fewer captions.
- Close on the opening image, resolved.

### 2.3 A recipe for each scene

Before coding a scene, write down these seven things. A scene missing one of them is usually the scene that feels flat.

| | What to write | Example (Send) |
| --- | --- | --- |
| Goal | Which goal it serves | 2: show the real flow |
| Sentence | What happens, in one or two sentences. It becomes the scene's alt text and transcript entry. | "On the send step Gisted writes the X post, Sam adds a question for readers, and Copy post publishes the page." |
| Actor | The one thing that acts: a cursor, the camera, particles, or a diagram drawing itself | The cursor: three presses |
| Beats | Two to four named moments with times | `TAB = 1.15`, `ASK = 3.95`, `COPY = 5.42` |
| Camera | Hold, push, hold, pull back | Push to 1.3× over the post while it is written, back out for the publish |
| Exit | How it leaves, ending exactly on the scene's last frame | The window flies off from 6.75 for 0.75 s; the scene is 7.5 s long |
| Still | The one frame that shows what the scene is about, for reduced motion | 5.9, just after publishing |

### 2.4 Captions

- A kicker plus one sentence of at most 110 characters, so it fits two lines. A test enforces the length.
- Plain benefit language. Numbered kickers ("01 · Paste") mirror the product's own steps.
- One per scene, two where the scene turns. None on the hook or the close: the type on screen is the message.
- **Give a caption time to be read.** Count the kicker and the sentence together, and treat 20 characters a second as a ceiling, not a target. That figure is Netflix's limit for adult subtitles (the BBC's guidance is 160 to 180 words a minute), and it was set for text that accompanies speech. A caption here competes with a moving picture, so it needs more time, not less. Most captions in the reference run at 11 to 19 characters a second. The seven in the pipeline scene run at 25 to 51, which is too fast (§13). Size a scene to its captions, or cut words. Appendix B has a test that enforces the ceiling.
- Captions sit over a gradient at the bottom of the stage, and move below it on screens up to 720 px wide. Keep the bottom 120 px of the canvas free of anything essential.

### 2.5 Truth

- **Map every claim to its source.** A claim is anything the film asserts as fact: what the system does at each step, a number, a named technology, who built it. Interface labels copied from the real screens are not claims. The pipeline scene shows only what the function does, and `docs/portfolio-gisted-reel.md` has a table of each step, what is on screen, and the function that does it. Make the same table for yours.
- **No invented numbers.** No timings or costs are shown, because none were measured. Derived numbers are tested: "197 of 280" is the post's length plus 24, and a test asserts it.
- **Say what is illustrative.** The mention that gets dropped and the quoted fragments illustrate a real rule but are not output from a real run. The record says so.
- **Show a limitation when it is part of the design.** The evidence document reads `coverage: partial`, with "Transcript read, visuals not inspected. The page will say so." A system that states what it did not look at is more convincing.
- **Check claims about the builder too.** "Designed, built and run by one person" has to be true.

### 2.6 The poster and the ending

- The poster is the finished closing card with a play button over it. The WebGL layer keeps moving gently behind it.
- It plays on a click, never on its own. The button says what the viewer is in for: "01:25 · 10 scenes · no sound".
- When the film ends, a real `<a>` is laid exactly over the drawn link, and the play button becomes Replay.

## 3. Read the product first

**Find the source before anything else, and ask if it is not obvious.** Do not guess from a folder with a similar name. Gisted's own repository, for instance, was cloned from Stash's and still carries Stash's history, so it is not where Stash lives.

All of this is reading. In the reference build it took about five minutes, in parallel, and it decided how the film looks.

| Read | To get | For Gisted, in `/Users/will/Appdev/gisted` |
| --- | --- | --- |
| The design doc, tokens and global stylesheet | Colors, type, radii and shadows, and the rules for using them. Copy the tokens exactly. | `DESIGN.md`, `src/gisted/styles/gisted.css` |
| The icon, doodle and wordmark components | The drawing kit. Carry it over as inline SVG strings, as `art.tsx` does. | `Icon.tsx`, `Doodle.tsx`, `Wordmark.tsx` and `DrawnCovers.tsx` in `src/gisted/components/` |
| The component for each screen in the flow | The real layout and the real copy. Recreate each screen at a fixed width. | `src/gisted/components/create/` |
| The product's own marketing demo | The example content and cast. Reuse them, so the film agrees with the product's site. | `DemoScenes.tsx`, `HowDemo.tsx` and `demoStory.ts` in `src/gisted/components/home/` |
| The back end of the feature to dramatize, and its docs | The steps of the under-the-hood scene, each tied to a function | `supabase/functions/gisted-enrich/`, `supabase/functions/_shared/enrichment-engine/`, `docs/gisted/enrichment-quality.md` |

And in the site that will host the film:

| Read | To get | Here |
| --- | --- | --- |
| The existing walkthrough | What to keep, what is broken, and the way back | `src/concepts/practice/<project>/` |
| The host page and its stylesheet | Where the film mounts, and which global rules will leak into it (§8) | `src/concepts/practice/Practice.tsx`, `practice.css` |

Stay read-only in the product's repository, and do not open `.env*` files.

**If there is no source to read, or the product is not a web app, this method has not been tried.** The reference recreated React screens from their components. For a native app, or a product you only have screenshots of, you would be redrawing screens from pictures, which is slower and easier to get subtly wrong. Settle with the owner which surface carries the story (§12), and say in your record which screens were redrawn from images.

## 4. How it is built

```
timeline.ts   pure data and math, no imports
  SCENES[]: id, label, start, dur, still, post, alt, captions[], cam[]
  sceneIndexAt · mountedAt · captionAt · cameraOf · particlesAt · backdropAt
      │
clock.ts      createClock() → { time, set(t), subscribe, onFrame }
      │       set(t) notifies React subscribers first, then per-frame painters
      ├─ GistedReel.tsx   the player: rAF loop, seek, chapters → paint(t) = clock.set(t) + controls + WebGL draw
      ├─ SceneFrame       one per mounted scene: sets --gr-t on its root and the camera transform on .gr-world
      │    └─ scenes      <World> moves with the camera, <Hud> stays put; elements carry {...a(name, at, d)}
      ├─ Pointer          measures [data-spot] elements on every frame
      └─ particles.ts     draw(t, camera): positions computed in the vertex shader
```

The Gisted film's class and property prefix is `gr`. A second film in the same site needs its own (§11).

### 4.1 The timeline is data, tested without a browser

`timeline.ts` imports nothing, so node can load it. A scene, condensed:

```ts
interface SceneDef {
  id: SceneId; label: string;     // label is the chapter button
  start: number; dur: number;     // start is summed from the durations before it
  still: number;                  // the frame shown when motion is reduced
  post: number;                   // seconds it stays mounted under the next scene's entrance
  alt: string;                    // the picture's accessible name, and the transcript
  captions: { at: number; kicker: string; text: string }[];
  cam: { at: number; x: number; y: number; zoom: number; ease?: 'in' | 'out' | 'inout' }[];
}
```

All times inside a scene are scene-local seconds. `at('send', 5.44)` converts to film time.

Layout shared between DOM and WebGL lives here too, in canvas px (`WIN`, `ITEM`, `PL`, `NODES`), so a particle formation and the DOM element it belongs to cannot drift apart.

The tests in `scripts/portfolio/test_gisted_reel.mjs` step through the film at 60 fps and assert that:

- scenes are contiguous, and each has a still and captions inside its own duration;
- at most two scenes are ever mounted;
- the camera never moves the picture more than 40 px or changes zoom by more than 10% in one frame;
- the dive into the card and the way back out of it use the same camera key, and the backdrop is fully black for the whole scene in between;
- particles are a pure function of time, so seeking and replay give the same frame;
- particles only change formation abruptly while their opacity is under 0.01;
- staged choreography stays in step (each tile appears in turn while the model is writing);
- diagrams are connected graphs and fit the frame clear of the caption;
- the numbers shown on screen are the ones the data implies.

Appendix B has the loader that makes this possible.

### 4.2 Scrubbed motion: the core technique

Every animated element carries a paused CSS animation whose delay is its start time minus the scene's clock. Setting one custom property on the scene root puts the whole scene at that moment.

```css
@property --gr-at { syntax: '<number>'; inherits: false; initial-value: 0; }
@property --gr-d  { syntax: '<number>'; inherits: false; initial-value: 0.55; }

.gr [data-a] {
  animation-duration: calc(var(--gr-d) * 1s);
  animation-delay: calc((var(--gr-at) - var(--gr-t, 0)) * 1s);   /* --gr-t: scene-local seconds, set per frame */
  animation-timing-function: var(--ease);
  animation-fill-mode: both;
  animation-play-state: paused;
}
.gr [data-a='rise'] { animation-name: gr-rise; }
@keyframes gr-rise { from { opacity: 0; transform: translateY(12px); } }
```

```ts
// clock.ts: props for an element that starts at `at` and lasts `d` seconds
export function a(name: string, at: number, d = 0.55, style?: CSSProperties) {
  return { 'data-a': name, style: { '--gr-at': at, '--gr-d': d, ...style } as CSSProperties };
}
```

```tsx
<h2 className="gr-home-h" {...a('rise', 0.3, 0.7)}>Don’t just send a link.</h2>
```

Rules that follow from it:

- **Entrances define `from`, exits define `to`.** The element's own styles are then the resting state, and `fill-mode: both` holds the first keyframe before the start and the last after the end. Two entrances (`window`, `grow`) need both ends spelled out.
- **An animation that begins visible needs `fill-mode: forwards`.** `both` would show its first frame from the start of the scene (§10, the ripple).
- **`a()` returns a `style` prop.** An element's own inline styles go in as its fourth argument. A separate `style={…}` before the spread is silently replaced (§10, first row). Custom properties that an animation reads go in the same way, through `vars()`: `a('scroll', 4.8, 0.8, vars({ '--gr-by': '-158px' }))`.
- **One animation per element.** For an entrance and an exit, wrap it: the entrance on the inner element, the exit on the wrapper.
- **Exit a group through one wrapper around the whole group**, or the container outlives its contents (§10).
- **Looping motion follows the clock as well**, so a paused film is a still frame:
  ```css
  .gr-spin { animation: gr-spin 1.1s linear infinite paused; animation-delay: calc(var(--gr-t, 0) * -1s); }
  ```
- **Continuous motion can read the clock directly**: `transform: rotate(calc(var(--gr-t) * 16deg))`, `stroke-dashoffset: calc(var(--gr-t, 0) * -44px)`.
- **Short transitions on state classes are fine.** A focus ring or a lit node may ease over 0.2 to 0.3 s with an ordinary `transition`; the reference has five of these. Know what that costs: a capture taken 320 ms after a seek shows the settled state, where live playback shows it part-way. Anything longer, or anything that tells the story, goes on the clock. Captions are the other exception: they sit outside the canvas and fade in with a normal animation.
- **A finished state costs nothing.** Give a component a start time in the past and every animation in it is already complete. The poster is `<TitleCard at={-9} cta />`.
- `--gr-at` and `--gr-d` are registered with `inherits: false` as a guard, so timing set on a wrapper can never reach a descendant. `--gr-t` is deliberately not registered: it has to inherit.

About 130 `a()` call sites, many of them inside loops, held 60 fps. Changing the delay of a paused animation repositions it in Chromium, WebKit 26 and Firefox 142; all three were checked by frame.

### 4.3 React reads the clock two ways

```ts
// A value derived from scene-local time. The component re-renders only when the value changes.
export function useAt<T extends string | number | boolean>(select: (local: number) => T): T {
  const { clock, start } = useScene();
  return useSyncExternalStore(clock.subscribe, () => select(clock.time - start));
}
// Work done by hand on every frame, and once on mount.
export function useFrame(paint: (local: number) => void) { /* clock.onFrame(...) in an effect */ }
```

- `useAt` is for discrete things: `useAt((t) => t >= COPY)`, `useAt((t) => typed(text, t, 1.25, 24).length)`, `useAt((t) => stepped(t, STATUS))`. **Selectors return a string, a number or a boolean, never a new object**, or the component re-renders every frame.
- Painting by hand on every frame is for what CSS cannot express. `SceneFrame` sets the scene's `--gr-t` and the camera transform through `clock.onFrame`. Inside a scene, `useFrame` does the same job; the pointer uses it.
- Frame painters run before React has committed the re-render for that moment. During playback the one-frame lag is invisible. After a seek it is not, so `seek()` paints a second time in the next animation frame.

The earlier cut called `setState` on every frame and re-rendered the whole tree. Avoid that.

### 4.4 One canvas, one camera

Everything is composed on a fixed **1280 × 720** canvas and scaled to the stage with `k = min(width / 1280, height / 720)`.

- The stage may be wider than 16:9. The picture is then pillarboxed while the WebGL backdrop fills the whole stage.
- The stage may be taller than 16:9 (a portrait fullscreen). The picture is letterboxed, and the WebGL zoom is divided by `tall = height / (720 × k)` so the particles still line up.
- The player publishes `--gr-k`, `--gr-ox` and `--gr-oy` on the stage, so anything laid over the picture (the real end link) can be placed in canvas px.
- **On a phone the canvas is about a quarter of its design size**, so 13 px text inside an app window is under 4 px and cannot be read. The film still works there because captions are drawn outside the canvas at real size and the camera pushes in on what matters. Never let small in-window text carry a point on its own.

Each scene has camera keys: the canvas point at the centre of the frame, and a zoom. The same camera drives both layers.

```ts
// DOM: on the scene's .gr-world
`translate(${W / 2}px, ${H / 2}px) scale(${cam.zoom}) translate(${-cam.x}px, ${-cam.y}px)`

// WebGL: a perspective camera at the distance where 1 world unit is 1 canvas px
export const D0 = H / 2 / Math.tan((FOV / 2) * Math.PI / 180);     // FOV 30 → about 1343.5
camera.position.set(cam.x - W / 2, H / 2 - cam.y, D0 / cam.zoom);  // canvas y runs down, world y runs up
```

- Text stays crisp DOM. Particles line up with it at depth 0, and anything given depth shows parallax when the camera moves.
- Zoom is interpolated geometrically, `a.zoom * (b.zoom / a.zoom) ** p`, so a long push looks steady.
- `cameraOf` returns a key's values exactly once that key is reached. Interpolating at `p = 1` gave `0.44000000000000006` and failed a test.
- Two keys with the same values are a hold.
- `<World>` holds what the camera moves. `<Hud>` holds what stays fixed to the screen, such as a scene title or a rail of step names.

### 4.5 Mounting, and getting between scenes

Only the current scene is mounted, plus the previous one for its `post` seconds. Each has its own local clock and camera. A scene unmounts at its end, so **it has to clear itself off the screen by its last frame**. There are three ways between scenes:

| Transition | How | Used for |
| --- | --- | --- |
| Exit, then entrance | A wrapper with `out`, `leave` or `send-off` ending on the last frame; the next scene's entrances begin at 0 | Most scenes |
| Cut on a solid color | The outgoing scene fills the frame with one color and the incoming scene opens on the same color. The cameras need not match, because the eye has nothing to compare. | The dive: zoom ×12 into the card's black thumbnail, cut to the pipeline on the same black (`#040405` in both), and later open the next scene back on that thumbnail at ×12 and pull out |
| Overlap | `post: 0.5` keeps the old scene underneath while the new one fades in over it | Findings into the editor |

For a dive, the element you zoom into has to fill the stage before the cut, at the widest shape you support. With a final zoom of 8, the card's black covered a stage 2.9 times wider than tall only in the last 14 ms of the move, less than one frame, so its edges were in view right up to the cut. At 12 it covers five frames earlier. A test holds the margin: at the final zoom the card's picture must cover a stage four times wider than tall (`ITEM.w * DIVE >= H * 4`).

## 5. Scene patterns

### 5.1 The pointer

```tsx
<Pointer
  path={[[0.95, [1020, 640]], [1.52, 'composer'], [2.0, [716, 398]], [3.2, 'go'], [5.0, [900, 560]]]}
  presses={[1.6, 3.38]}
/>
```

- Each path entry is the second it arrives and where: canvas coordinates, or the name of an element tagged `data-spot="…"`. Pass `touch` for a fingertip.
- **It measures its target on every frame**, relative to `.gr-world`, and divides the scale back out. A target that is scrolling, zooming or still animating into place is met where it ends up. Measuring once at set-off was the worst bug of the build (§10).
- A glide lasts at most 0.72 s, leaves from wherever the pointer is resting, and bows slightly.
- It arrives 0.06 to 0.2 s before its press. A press shrinks it to 0.86 for 0.16 s and sends out a 0.6 s ripple.
- **Make the press time a named constant** that also drives the state change and the animations: `const sent = useAt((t) => t >= COPY)`. The first scene written, `Paste`, uses bare numbers a few hundredths apart instead, which is the thing to avoid.
- **Park it off the text.** Add a waypoint so the cursor moves aside before typing starts.

### 5.2 Other patterns

| Need | Pattern | Where |
| --- | --- | --- |
| Typed text | `typed(text, t, start, cps)` through `useAt(...length)`. A person types at 24 characters a second, 34 on a phone; a machine writes at 104. The caret's blink is scrubbed. | `Customize`, `Send`, `HearBack` |
| A status label that changes | `stepped(t, [[time, value], …])` | `Board`, `Pipeline` |
| A list arriving in order | A schedule function, `cardAt(i) = 1.2 + i * 0.36`, used by the card, its leader line and the status label alike | `Board` |
| A line that draws itself | `pathLength="1"` with the `draw` animation. Dashed lines cannot use it, so they fade. | `Tree`, `System` |
| A dot travelling along a line | `offset-path: path('…')` with the `run` animation | `Board` |
| Lines between laid-out elements | Measure with the `offsetLeft`/`offsetTop` chain, not `getBoundingClientRect`, so entrance transforms and the camera do not distort them. Measure again after `document.fonts.ready`. | `Board`'s leaders |
| Hand-drawn wobble | `seeded(n)` instead of `Math.random()`, so it is identical on every visit and every seek | `Board`, `particles.ts` |
| Scrolling a panel | The `scroll` animation with `--gr-by: -158px`. Work the distance out from the content; an over-scroll shows blank space. | `Customize`, `HearBack` |
| A counter ticking up | Give the number `key={index}` and the `bump` animation at that step's time | `Stat` |
| Dimming a group while attention is elsewhere | The `dip` animation on a wrapper | `Pipeline` tiles during grounding |
| Artwork that scales with its box | `container-type: inline-size` and `cqw` units | `.gr-thumb` |
| Text that becomes particles | Put DOM text and the particle formation in the same place and the same font, and cross-fade over about 0.3 s | `Hook` |
| Keeping the viewer oriented in a long travelling scene | A rail of step names in the HUD that lights up as the camera arrives, plus numbered captions | `Pipeline` |
| Showing which step of the product this is | A window bar whose address changes with each step, and the product's own step indicator | `WinBar`, `StepHead` |

### 5.3 The animation vocabulary

All are `data-a` values with keyframes in `gisted-reel.css`. The default duration is 0.55 s and the default easing is `cubic-bezier(0.22, 1, 0.36, 1)`. Spring entrances use `cubic-bezier(0.3, 1.5, 0.5, 1)`.

| Kind | Names |
| --- | --- |
| Entrances | `fade`, `rise`, `left`, `slide`, `pop`, `kinetic` (headline type, with blur), `window` (the app window tilting up), `deal` (cards from below), `phone`, `land-l`, `land-r`, `grow`, `toast` |
| Exits | `out` (ends with `visibility: hidden`), `leave`, `send-off` (flies away in 3D), `deliver` |
| Emphasis | `lift`, `bump`, `dip`, `flash`, `brace`, `strike`, `paste`, `key`, `ripple` |
| Drawing and travel | `draw`, `run`, `sweep` (distance in `--gr-bx`), `scroll` (distance in `--gr-by`) |

### 5.4 Timings that shipped

These are the values in the reference, approved on one viewing. Start from them, and do not treat them as tuned.

| | |
| --- | --- |
| Entrances | 0.4 to 0.7 s. The app window takes 0.85 to 0.95 s. |
| Stagger within a list | 0.07 to 0.09 s |
| Results landing one by one | 0.36 s apart |
| Spotlighting cards in turn | 0.7 s apart |
| Checks ticking off | 0.2 to 0.25 s apart |
| A diagram growing | 0.5 s per hop from the hub; 0.38 s per step of a traced path |
| Camera push, hold, pull back | 0.8 to 1.1 s, then 1.3 to 1.9 s with a slow 16 to 20 px drift, then 0.8 to 0.9 s |
| Detail zoom | 1.3× to 1.5× |
| Ambient drift on a still scene | 1.05× easing to 1.0× across the whole scene |
| Dive in, and back out | 1.25 s easing in to 12×; 1.4 s easing out |
| Scene exits | 0.3 to 0.75 s, ending exactly on the last frame |

## 6. The WebGL layer

`particles.ts` (445 lines) uses three.js 0.180, which the site already had. It is loaded with `import('./particles')`, so the film starts without it. Its own code builds to a 5.7 kB gzipped chunk; three.js is a separate chunk of about 530 kB before compression, which this site already shipped for other pages. In a project that does not have three.js yet, that weight is a decision for the owner (§12).

**Use WebGL for what the DOM cannot do**: thousands of points, glow, depth. Text and interface stay DOM, where they are crisp and easy to lay out and to check.

**This layer assumes a dark stage.** Its points are drawn with additive blending over a near-black backdrop, and additive light cannot be seen on a light ground. A film on a light stage would need ordinary blending and ink-colored points, or no particle layer at all. Neither has been tried, so settle it with the owner first (§12).

**One set of points, moved in the vertex shader.** The geometry holds two formations, `position` (A) and `aB` (B). The timeline says which two and how far along:

```glsl
// uP: progress through the segment · aOrder: this particle's place in the queue · uStagger: how spread out departures are
float p = clamp(uP * (1.0 + uStagger) - aOrder * uStagger, 0.0, 1.0);
float q = p * p * (3.0 - 2.0 * p);
vec3 pos = mix(position, aB, q);
pos += drift * uTurb * sin(p * 3.14159265);   // turbulence only mid-flight, so both ends are exact
```

```ts
// timeline.ts: one row per move
{ t0: HOOK + 2.95, t1: HOOK + 4.9, a: 'titleLink', b: 'spark', mode: 0, stagger: 0.55, turb: 120, order: 'seed' },
hold(PIPE - 0.6, 'pipeLink'),   // a cut to a new formation, placed where opacity is 0
```

Formation arrays are copied into the two attributes only when the segment changes. Everything else is uniforms, so seeking is exact and cheap.

**Formations are sampled from a drawing.** `inkPoints()` paints white text or a `Path2D` onto an offscreen 2D `<canvas>` element, reads the alpha channel, and picks random inked pixels with the seeded generator. Any word, logo or shape becomes a formation in a few lines. The reference samples text in a system monospace stack, which is always available. To sample a web font, wait for it first (`document.fonts.load('600 30px YourFont')`), or the letters will be drawn in a fallback face. That case has not been tried.

**Other things worth copying:**

- **Brightness per formation.** With additive blending, a dense formation burns out to a white block and a sparse one disappears. Each formation has a gain (0.36 for the packed page, 1.25 for the node halos) that is blended in late in the flight.
- **Departure orders.** `seed` is random. `queue` empties the link toward the gate. `sweep` releases words as the model's sweep line passes them. Clamp every order to 0..1.
- **The backdrop is drawn by the same layer**: a full-screen quad with two drifting glows, a dotted floor that follows the camera, a vignette, and a little noise against banding. The WebGL element is opaque.
- **Dust wraps around the camera** with `mod`, so there is dust wherever the camera travels. `PULSES` in the timeline sends a ring through it at each important press.
- **Sizes are in canvas px.** `uPx` is drawing-buffer px per canvas px, and the pixel ratio is capped at 2.
- **The poster breathes.** Before play, the layer redraws the poster frame about 30 times a second with a small time offset, and only while it is on screen.

**GLSL that is undefined on some GPUs. Do not write it:**

- `smoothstep(hi, lo, x)` with the edges reversed. Write `1.0 - smoothstep(lo, hi, x)`.
- `pow(x, 2.0)` where `x` can be negative. Write `x * x`. On an affected driver the result is NaN, which would have blanked the dust for the rest of the film.

**Lifecycle:**

- On unmount call `renderer.dispose()` and `renderer.forceContextLoss()`. Browsers allow only a few live WebGL contexts, and a single-page app leaks one per visit otherwise.
- Wrap the build in `try`/`catch` and dispose the renderer if it throws.
- On `webglcontextlost`, call `preventDefault()`, dispose without forcing the loss, and switch to the fallback.

**The film has to work without it.** When WebGL is missing or lost the stage gets `is-flat`: a CSS gradient backdrop, the logo mark as a doodle, ruled lines for the page of evidence, and placeholder lines in the tiles. So nothing essential is carried by particles alone: every label is DOM.

## 7. The player

`GistedReel.tsx` is 298 lines. The things it gets right, as a checklist for yours:

- **Poster**: the closing frame with a play button, never autoplay. It is one component rendered outside any scene, with start times in the past so that it is already finished (§4.2). Being outside a scene, it can use `a()` but not `useAt`, `useFrame` or `Pointer`. The stylesheet cancels the camera transform for it (`.gr-poster .gr-world`), and the WebGL layer is drawn at the film time named by `POSTER`.
- **Starting** moves focus to the stage, so the keys work at once. Images that later scenes need are preloaded when the player mounts.
- **Play loop**: `requestAnimationFrame`, with the step clamped to 0.1 s so a stalled tab does not jump ahead.
- **Pauses on its own** when the tab is hidden or the stage scrolls out of view.
- **Seek** paints twice (§4.3).
- **Keyboard**: Space plays and pauses, and the arrow keys move 3 s. Both are ignored while focus is on a button, the slider or a link.
- **Slider**: a range input from 0 to the film's length in 0.05 s steps, with ticks at scene starts and `aria-valuetext` such as "00:50 of 01:25, Any content".
- **Chapters**: one button per scene, with `aria-pressed` on the current one.
- **Fullscreen** goes on the element that wraps stage and controls. The same layout is mirrored on an `is-full` class, because headless Chrome cannot enter real fullscreen.
- **Reduced motion**: it never plays. Each scene opens on its `still`, the main button becomes "Next scene", chapters jump to stills, and CSS transitions are off.
- **Accessible names**: the stage is `role="group"` with a label that explains the keys. The picture is `role="img"`, labelled with the current scene's name and `alt`. Everything inside the canvas is `aria-hidden`.
- **Transcript**: a `<details>` listing every scene's `alt`.
- **Stage shape**: `aspect-ratio: 16 / 9; max-height: max(240px, calc(100vh - 150px))`. On a short window the stage becomes wider than 16:9 instead of running off the screen.
- **The end**: the play button becomes Replay, and the real link appears.

## 8. Living inside a host site

- **The host's element rules reach in.** Here `.practice nav` forced layout on the chapter bar and `p { line-height: 1.6 }` hit every paragraph. Reset with zero specificity, `:where(.gr) :where(p, h2, …) { margin: 0 }`, so every class of your own still wins. Where the host has a class-plus-element rule, answer with two classes: `.gr .gr-chapters`.
- **One stylesheet serves every scene.** Class names must be unique across scenes, so grep before naming one.
- **No bare-element descendant selectors in anything that nests components.** `.gr-unfurl b` restyled the `<b>` inside a thumbnail drawn within it. Use `.gr-unfurl > b`.
- **A lazy chunk's CSS stays loaded after navigation in a single-page app.** A second film with the same prefix would collide with the first (§11).
- **Fonts.** If the brand's typeface or weight is not already on the host site, adding it is the owner's decision (§12). Gisted's is Inter, which is openly licensed, so it was self-hosted with its licence beside it. A commercial typeface may not be yours to ship. Use `font-display: swap`, and wait for `document.fonts.ready` before measuring layout or capturing frames.
- **Lint.** With `react-refresh`, a file that exports components may not export helpers. That is why `a()` lives in `clock.ts`.
- **Leave the owner's dev server alone.** If it is already running on 8080, use it. If you start your own while theirs is up, Vite moves to the next free port and prints it; use that port in every URL in §9. Serve built output on a different port again.
- **This repository's baseline.** `strict` is off. `npx tsc --noEmit -p tsconfig.app.json` already reports 19 errors in `src/components/home/` and `src/hooks/useProjectData.tsx`; yours should add none. A production build ends by reading the site's content from Supabase to write its agent-readable pages, so it needs network access.
- **Commit, push and deploy only when asked.** Here deploying is `vercel --prod`, on the owner's word alone.

## 9. Checking it

An agent cannot watch the film. It can read frames, measure, and count.

| Check | Catches | Blind to |
| --- | --- | --- |
| Timeline tests (§4.1) | Gaps, camera jumps, visible cuts, choreography out of step, wrong numbers | Anything visual |
| Exact frames by seeking (`shoot.mjs`) | Layout, overlap, clipping, wrong state at a time, leaks from the host's CSS | **Anything measured at run time.** A seek re-measures, so a stale measurement looks right. |
| Frames from live playback (`live.mjs`) | Pointer targets, measured overlays, anything that depends on having played | |
| A real-time run (`play.mjs`) | Frame rate, long frames at scene changes, end state, replay, chapters, keys, pausing off screen | |
| Modes | Reduced motion, a phone, a short wide window, the fullscreen layout, WebGL switched off | Real devices |
| Other engines (`--browser=webkit`, `firefox`) | Engine differences in scrubbing, layout and WebGL | Shipping Safari and iOS |
| The built site | Chunking and asset paths | |
| An independent review (Appendix C) | Logic the method cannot see. It found the two real defects here. | |
| A person watching | Pacing and feel | |

### What to capture

- Three to six beats per scene, and each scene's still.
- Both sides of every scene boundary, 0.05 to 0.3 s either way.
- Every press, from live playback: just before it and 0.2 s after.
- A contact sheet makes about fifteen frames readable in one image, four or five across and about 2,000 px wide. Take 2× close-ups of dense screens.
- Collect console errors and warnings on every run; the scripts print them. There should be none, with one exception: in the WebGL-off run three.js itself logs three "WebGL context could not be created" errors before the fallback takes over.
- Keep scripts and captures in a scratch folder outside the repository, one folder per film, so one film's frames cannot overwrite another's.

### Commands

Setup, once. The version is pinned so it reuses the WebKit and Firefox builds already in `~/Library/Caches/ms-playwright` on this machine:

```bash
mkdir -p /tmp/<project>-film-check && cd /tmp/<project>-film-check && npm init -y && npm i playwright-core@1.56
# Save the scripts from Appendix A here. Chrome is the installed one. For the other engines:
npx playwright-core install webkit firefox
```

```bash
URL=http://localhost:8080/project/<id>          # the port your dev server printed; add --p=<prefix> to every command if yours is not gr
node shoot.mjs --url=$URL --poster 3.4 6.95 7.05 13.3 13.6            # exact frames
node shoot.mjs --url=$URL --dsf=2 --out=hi 35.6                       # a 2× close-up
node live.mjs  --url=$URL 62:65.75,69.3                               # seek to 62, play, capture as 65.75 and 69.3 pass
node play.mjs  --url=$URL                                             # a full real-time run; takes the film's length plus about 15 s
node shoot.mjs --url=$URL --browser=webkit --out=wk 8.9 17.4 40.2     # another engine
node shoot.mjs --url=$URL --reduced --out=reduced 26.1                # reduced motion
node shoot.mjs --url=$URL --w=390 --h=844 --dsf=2 --mobile --out=phone 35.6
node shoot.mjs --url=$URL --w=1500 --h=620 --out=short 13.3 17.6      # a stage wider than 16:9
node shoot.mjs --url=$URL --full --out=full 35.6                      # the fullscreen layout, simulated
node shoot.mjs --url=$URL --nogl --out=flat --poster 5.9 17.5 24.4    # WebGL unavailable
node where.mjs --url=$URL 10.3 go                                     # canvas coordinates of a data-spot at a moment
python3 sheet.py sheet.png 4 490 frames/t-*.png                       # a contact sheet (needs Pillow)
```

The times in these examples are the Gisted film's. Two things about them:

- **Seeks are exact.** The player's slider moves in steps of 0.05 s, so as shipped a seek to 47.22 lands on 47.2. The scripts set the slider's step to `any` after pressing play, which makes a seek land where it is asked and the clock read back exactly.
- **A live capture lands a few hundredths late.** `live.mjs` pauses the film as the clock passes the time you ask for, and prints the time it got. Ask for a moment just before the one you care about.

In the repository:

```bash
npx tsc --noEmit -p tsconfig.app.json | grep "concepts/practice/<project>/"          # no output means no errors in your folder
npx eslint src/concepts/practice/<project>/reel                                      # this repo's config lints .ts and .tsx only
node --test scripts/portfolio/test_<project>_reel.mjs                                # npm test runs every scripts/portfolio/test_*.mjs
npx vite build --outDir /tmp/<project>-film-check/dist                               # leaves the repo's dist alone; needs network access
npx vite preview --outDir /tmp/<project>-film-check/dist --port 4319 --strictPort    # serve the build, then point the scripts at port 4319
```

## 10. Mistakes made here

Every row happened during the reference build.

| What was seen | Cause | Fix, and how to avoid it |
| --- | --- | --- |
| Every label in a scene sat at the canvas origin | `style={{…}} {...a(…)}`: the spread's `style` replaced the inline one, 18 times | Pass styles as `a()`'s fourth argument. Render one scene before writing ten. |
| In real playback only, a fingertip pressed 200 px from its target | The pointer measured its target once, at set-off, while the target was still scrolling. Seeks re-measure, so every captured frame looked right. | Measure on every frame. Check presses from live playback. |
| Faint rings at the cursor tip before each click | `fill-mode: both` showed the ripple's visible first keyframe early | `forwards` for anything that starts visible |
| A row of controls collapsed; a chip became absolutely positioned | The same class name used in two scenes | Unique names across scenes; grep first |
| A thumbnail's drawing broke inside another card; an avatar went grey | `.card b` and `.who span` reached into nested components | Child combinators, or `:not()` |
| Chapter buttons wrapped with odd gaps; paragraph spacing was off | The host's `nav` and `p` rules leaked in, and a `.gr p` reset outranked single-class margins | `:where()` resets; two-class selectors where the host uses class plus element |
| A page of text rendered as a solid white block | Thousands of additive particles in a small area | Fan the sheets back in depth, lower that formation's gain, use thinner marks |
| Halos around diagram nodes were invisible | The opposite: too sparse and too dim | A tighter formation and a gain above 1 |
| A dark panel lingered after its contents faded | The exit was on the children, not the container | One wrapper around the whole group carries the exit |
| A hard cut at the end of a scene; a title from one scene showing in the next | No exit, and the scene unmounts at its end | Every scene ends with an exit on its last frame, a cut on a solid color, or `post` overlap |
| A dive showed the edges of the card on a short, wide stage | A final zoom of 8 filled a stage 2.9 times wider than tall only on the last frame | 12, which fills it five frames before the cut, and a test for the margin |
| A test failed on `0.44000000000000006` | Interpolating a camera key at `p = 1` is not exact | Return key values exactly once the key is reached |
| Labels in fixed-width tiles were cut off | Tiles sized before the labels were written | Size from the longest label, then re-space what depends on it |
| A toast covered the button being pressed | It was centred over the action | Look at the frame of each press for overlaps |
| The cursor sat on top of text being typed | It rested on its click target | Add a waypoint off the text |
| Blank space at the bottom of a phone screen | A second scroll went past the end of the content | Work scroll distances out from the content |
| A hand-drawn loop meant "it comes back around", and did not read | An abstract symbol | Point an arrow at the specific thing instead |
| Nothing was visibly wrong | `smoothstep` with reversed edges is undefined | `1.0 - smoothstep(lo, hi, x)` |
| Nothing was visibly wrong | `pow` of a negative base is undefined, and NaN on some drivers | `x * x` |
| Nothing was visibly wrong | The WebGL context was not released on unmount, or if setup threw | `forceContextLoss()` in `dispose`; `try`/`catch` around the build |
| A few particles snapped into place at the end of a move | A departure order above 1 | Clamp orders to 0..1 |
| Lint warnings in a component file | It exported helper functions | Helpers live in a non-component module |
| Fullscreen could not be tested headless | Headless Chrome cannot enter it | Mirror `:fullscreen` on a class and test the layout by adding it |
| Small grey text at 4.1:1 contrast | `#77756d` on `#121110` | `#918f86` |
| A screen reader would announce an unnamed element, and raw seconds | A focusable stage with no role or name; a slider with no value text | `role="group"` with a label; `aria-valuetext` |

## 11. Reusing the Gisted code

The engine has not been pulled out into a shared module. It lives inside the Gisted film, mixed with Gisted's content, so a new film starts by copying that folder and cutting it down.

The steps in this section were run on 2026-11-11 in a clean scratch project outside this repository (Vite 5, React 18, `three` and `lucide-react`, nothing else). The renamed copy played the whole Gisted film there. The cut-down copy played a one-scene film with a cursor, a camera move and a press, passed its tests, and logged no console errors. Nothing beyond that one scene has been built from them.

### What each file is

| File | Lines | Keep | Rewrite |
| --- | --- | --- | --- |
| `clock.ts` | 64 | All of it | |
| `timeline.ts` | 417 | The math helpers, the scene types, scene assembly (`SCENES`, `at`, `sceneIndexAt`, `mountedAt`, `captionAt`), `cameraOf` and `cameraAt` | `STORY`, the layout constants, the scene list, and the whole particle section (the segments and their tables, `particlesAt`, `backdropAt`, `PULSES`) |
| `GistedReel.tsx` | 298 | The whole player | The scene imports and `VIEWS`, `POSTER`, the poster's content, the end link, two labels, the image preload |
| `art.tsx` | 243 | `Pointer`; how `Icon` and `Doodle` work (`data-draw` with `pathLength`) | The icons and doodles themselves. `Wordmark`, `Avatar`, `AliveThumb` and the covers are Gisted's. |
| `particles.ts` | 445 | `inkPoints`, `textFormation`, the shader skeleton, the shape of `createStage3D` (`draw`, `resize`, `dispose`) | Which formations exist, the pipeline's route (`mode` 1), the colors, the mark's path |
| `gisted-reel.css` | 651 | The `@property` lines and the resets at the top; the sections headed *the scrubber* and *the stage*; the pointer and ripple rules in *shared pieces*; the reduced-motion and small-screen rules at the end | The font and the tokens; every scene's own section; and the Gisted pieces that sit inside the kept sections, listed in step 6 |
| `scenes/*.tsx` | 890 | `World` and `Hud`, at the top of `app.tsx` | Everything else |
| `scripts/portfolio/test_gisted_reel.mjs` | 182 | The loader, and three tests after small edits (step 8). Two more once you have particles: seeking gives the same frame, and no visible cuts. | The dive, the particle sequence, the pipeline, the system graph and the on-screen numbers |

### What depends on what

The player and `art.tsx` import only generic things from `timeline.ts`. Gisted's content is wired in at two places:

- `particles.ts` imports `PL`, `TILES`, `tileRect`, `NODES`, `TITLE`, `PULSES`, `particlesAt` and `backdropAt`.
- Inside `timeline.ts`, the particle section looks up four scenes by name (`hook`, `pipeline`, `system`, `close`), `backdropAt` five more, and `PULSES` four.

**Remove a scene that any of those names and the module throws as it loads.** That is why the particle section goes first, in step 2.

### From the copy to a first frame of your own

**Before you start: the reference is not in git.** As of 2026-11-11 the whole `gisted/` folder is untracked, so a slip in a bulk rename could not be undone. Copy `src/concepts/practice/gisted/reel` to somewhere outside the repository first, or ask the owner to commit it.

**1. Copy it and rename the prefix.** Pick two or three letters (`xx` below). Both films' stylesheets end up loaded in one visit, so shared names with different styles would collide.

```bash
cd src/concepts/practice
cp -R gisted/reel <project>/reel && cd <project>/reel     # everything from here runs inside the copy
mv GistedReel.tsx <Project>Reel.tsx && mv gisted-reel.css <project>-reel.css
LC_ALL=C find . -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) -exec sed -i '' -E \
  -e 's/(^|[^A-Za-z0-9_])gr-/\1xx-/g' \
  -e 's/\.gr([^A-Za-z0-9_-]|$)/.xx\1/g' \
  -e 's/className="gr"/className="xx"/g' \
  -e 's/gisted-reel\.css/<project>-reel.css/g' \
  -e 's/GistedReel/<Project>Reel/g' {} +
grep -rnE '(^|[^A-Za-z0-9_])gr-|\.gr([^A-Za-z0-9_-]|$)' . || echo "no gr left"
```

That renames 917 tokens, 53 root-class rules and one `className`. `sed -i ''` is the macOS form. The copy still plays the whole Gisted film at this point, under the new prefix.

**2. Cut the timeline down** (`timeline.ts`):

- Delete everything from the `particles` divider to the end of the file.
- Delete the layout constants, from the comment "Where things sit on the canvas" down to `TRACE`.
- Set `SceneId` to your own scene names and `STORY` to your own content.
- Replace the `scenes` array with one scene:

```ts
const scenes: Omit<SceneDef, 'start'>[] = [
  {
    id: 'intro', label: 'Intro', dur: 6, still: 3.4, post: 0,
    alt: 'One or two sentences saying what happens in this scene. They name the picture and fill the transcript.',
    captions: [{ at: 0.4, kicker: '01 · Start', text: 'One plain sentence of at most 110 characters.' }],
    cam: [{ at: 0, ...CENTRE, zoom: 1.06 }, { at: 2.2, ...CENTRE }, { at: 3.0, x: 640, y: 430, zoom: 1.4 }, { at: 4.4, x: 640, y: 430, zoom: 1.4 }, { at: 5.2, ...CENTRE }],
  },
];
```

**3. Stub the WebGL layer.** Replace `particles.ts` with this. It throws, the player catches that, and the film runs on its flat backdrop until you write a real layer.

```ts
import type { Camera } from './timeline';

/* No WebGL layer yet. Throwing here makes the player fall back to its flat backdrop. */
export function createStage3D(_canvas: HTMLCanvasElement): {
  draw(time: number, cam: Camera, breath?: number): void;
  resize(width: number, height: number): void;
  dispose(release?: boolean): void;
} {
  throw new Error('This film has no WebGL layer yet.');
}

export type Stage3D = ReturnType<typeof createStage3D>;
```

**4. Replace the scenes.** Delete `scenes/app.tsx`, `scenes/pipeline.tsx` and `scenes/stage.tsx`. Keep `World` and `Hud` in a file of their own, `scenes/frame.tsx`:

```tsx
import { useContext, type ReactNode } from 'react';
import { SceneContext } from '../clock';

/** The part of a scene the camera moves over. */
export function World({ children, className }: { children: ReactNode; className?: string }) {
  const scene = useContext(SceneContext);
  return <div ref={scene?.world} className={`xx-world${className ? ` ${className}` : ''}`}>{children}</div>;
}
/** The part of a scene that stays put on screen. */
export const Hud = ({ children }: { children: ReactNode }) => <div className="xx-hud">{children}</div>;
```

Then write a first scene that exercises the engine: an entrance, a state change, a pointer and a press. This is `scenes/intro.tsx` as it was tested:

```tsx
import { Pointer } from '../art';
import { a, useAt } from '../clock';
import { STORY } from '../timeline';
import { Hud, World } from './frame';

const PRESS = 3.4;

/** The title, also used as the poster. It uses only a(), so it can render outside a scene. */
export function Title({ at }: { at: number }) {
  return (
    <div className="xx-title">
      <h2 className="xx-kinetic xx-title-h" {...a('kinetic', at, 0.7)}>{STORY.promise}</h2>
      <p className="xx-title-sub" {...a('rise', at + 0.4, 0.7)}>{STORY.second}</p>
    </div>
  );
}

export function Intro() {
  const pressed = useAt((t) => t >= PRESS);
  return (
    <>
      <World>
        <div {...a('out', 5.5, 0.5)}>
          <Title at={0.3} />
          <span className="xx-btn xx-first" data-spot="go" {...a('pop', 1.4, 0.4)}>{pressed ? 'Pressed' : 'Press me'}</span>
          <Pointer path={[[1.9, [980, 620]], [PRESS - 0.12, 'go'], [4.6, [900, 560]]]} presses={[PRESS]} />
        </div>
      </World>
      <Hud><span className="xx-kicker xx-first-tag" {...a('fade', 0.2, 0.5)}>Scene one</span></Hud>
    </>
  );
}
```

It expects `STORY` to be `{ promise: '…', second: '…' }`.

**5. Point the player at them** (`<Project>Reel.tsx`):

- Replace the three scene imports with yours, and `VIEWS` with `{ intro: Intro }`.
- Set `POSTER` to a time in your film, such as `at('intro', 3.2)`.
- Replace `<TitleCard at={-9} cta />` with `<Title at={-9} />`.
- Delete the two lines that preload `kinds.png`.
- Change the end link's address and text. Its place over the picture is `.xx-visit` in the stylesheet: 640, 586 in canvas px.
- Change the two labels that say Gisted: the section's `aria-label`, and the picture's label before play.

**6. Cut the stylesheet down** (`<project>-reel.css`):

- Delete the `@font-face` block, or point it at your typeface, and set `--xx-font`.
- Replace the color tokens in the `.xx { … }` rule. `--mg` is Gisted's magenta: give it your accent.
- In the looping-motion rule, drop `.xx-item-scan` and `.xx-hook-typing i` from the selector.
- Delete everything from the comment "The video's typographic thumbnail" down to the *without WebGL* divider. Your scenes' styles go there.
- Under *without WebGL*, keep only the `.xx-stage.is-flat` background, recolored.
- Under *small screens*, delete the `@container` rule about the poster, or adapt it.
- Recolor the three places where magenta is written out: the `paste` keyframe, the end link's hover ring, and the pressed chapter button.
- `.xx-wordmark` and `.xx-avatar` in *shared pieces* are Gisted's. Remove them when you remove those components from `art.tsx`.

The styles for the scene above:

```css
.xx-title { position: absolute; left: 0; top: 230px; width: 1280px; text-align: center; color: var(--cream); }
.xx-title-h { position: static; font-size: 58px; }
.xx-title-sub { margin-top: 18px; font-size: 24px; color: var(--dim); }
.xx-first { position: absolute; left: 580px; top: 414px; height: 36px; padding: 0 18px; font-size: 14px; background: var(--cream); color: #1a1918; }
.xx-first-tag { position: absolute; left: 44px; top: 34px; }
```

**7. Mount it and look.** `<Project>Project.tsx` renders the film above `ProjectGallery`, as `gisted/GistedProject.tsx` does. `Practice.tsx` lazy-imports it and chooses it by project id; follow the `GistedProject` lines there. Then, with the scripts from §9:

```bash
npx tsc --noEmit -p tsconfig.app.json | grep "concepts/practice/<project>/"    # expect no output
node shoot.mjs --url=$URL --p=xx --poster 1 2.6 3.37 3.6 5.9                   # the poster, then the scene at five moments
node live.mjs  --url=$URL --p=xx 2:3.45                                        # the press, from live playback
node play.mjs  --url=$URL --p=xx
```

You should see the title, a button that pops in, a cursor that glides to it while the camera pushes in, "Pressed" with a ripple at 3.4, and a fade out. The folder is now about 1,050 lines: the engine and one scene.

**8. Copy the test.** Copy `scripts/portfolio/test_gisted_reel.mjs` to `test_<project>_reel.mjs` and point its `load(...)` at your timeline. Keep the first three tests, with two edits: in the mounting test delete the last four lines, which are about Gisted's overlap, and in the camera test replace `T.DIVE` with the largest zoom your film uses. Delete the rest until you have the things they test. Add the caption test from Appendix B.

From here, build as in "Order of work": the remaining scenes, then your own `particles.ts` and the timeline's particle section, if the film is to have them.

### Other films, and pulling the engine out

Other cases here that still use earlier approaches are Stash (`stash/StashSlideshow.tsx`) and 4Eyes (`foureyes/FourEyesVideo.tsx`, `foureyes/TableauVideo.tsx`). For Stash, ask where the product's source is before starting: it is not in this repository, and Gisted's repository is not it (§3).

**Extract the engine once the second film works, not before.** Two copies of a thousand-line engine will drift. The shared parts are the clock, the timeline's helpers and types, the player, `Pointer`, `World` and `Hud`, and the engine half of the stylesheet. Make it a change of its own, tell the owner first because it touches a film they have approved, and use before-and-after frame captures of the Gisted film as the regression check.

**In another repository or stack**, the copy ran unchanged in a clean Vite 5 and React 18 project once `three` 0.180 and `lucide-react` were installed and the two files in `public/portfolio/gisted/` were copied across. Two things to know: the player reads `matchMedia` and `document` while rendering, so it is client-only (load it without server rendering), and it was written with TypeScript's `strict` off.

## 12. Decisions that belong to the owner

Ask these first if you can. If the session cannot take replies, decide, build, and list each one in your report as the owner's to overrule. What was chosen for Gisted is in the last column.

| Decision | Chosen for Gisted |
| --- | --- |
| Where the product's source is, and which of its surfaces carries the story | One web app, with its source on this machine |
| What kind of film it is: a walkthrough of the product, or the story of how it was designed | A walkthrough of the product |
| Length | 1:25, up from 1:09, because the pipeline scene is 16.5 s |
| Which feature gets the under-the-hood scene, and how much of the film | Enrichment; 19% |
| A dark or a light stage, and whether to have a WebGL layer at all | Dark, with a particle layer: the owner asked for three.js |
| Autoplay or click to play | Click to play; the poster idles |
| Sound | None. The earlier cut looked for a narration file that never existed. A narration would have to be recorded against the timeline. |
| What to disclose | The evidence document shows `coverage: partial`, on purpose |
| Real or illustrative data | The product's own fictional example; one illustrative dropped mention, recorded as such |
| Typeface | Inter, which is openly licensed, self-hosted |
| Added weight | A 352 kB variable font, loaded only on this case. three.js was already on the site. |
| The previous version | Kept in the folder, unused, as the way back: one import in `GistedProject.tsx` |
| The call to action | `gisted.co` |
| Claims about the builder | "Designed, built and run by one person" |
| Where to work, and whether to commit the reference first | In the owner's working tree, with nothing committed |
| Commit and deploy | Neither, until asked |

## 13. Known gaps in the reference

- **The pipeline scene's captions are too fast**: seven in 16.5 s, at 25 to 51 characters a second with their kickers, and the last is on screen for 1.2 s. One caption in Hear back runs at 24. The owner approved the film on viewing, but do not copy that pacing. Lengthen the scene or shorten the captions.
- **No recovery from a lost WebGL context.** After a GPU reset the film carries on in its no-WebGL form for the rest of the visit; there is no `webglcontextrestored` handler.
- **Where WebGL is unavailable, three.js logs three console errors** before the fallback takes over. The film plays, but that visitor's console is not clean.
- **Not checked as of 2026-11-11**: shipping Safari and iOS, real fullscreen, a slow GPU or old phone, and the deployed site. Firefox was checked by frame, not for frame rate.
- **Only one kind of film has been made**: a dark stage, a web app whose source could be read, an openly licensed typeface, and a WebGL layer the owner asked for. A light stage, a native product and a commercial typeface are untried (§3, §6, §8).
- **The reference is not in git** as of 2026-11-11, and the starting steps in §11 have been run once, as far as one scene with no WebGL layer.
- **No sound.**
- **The engine is not extracted** (§11), and `World` and `Hud` live in a scene file.
- **Written with `strict` off**, and client-only.
- The owner's "looking excellent" came from one viewing. Nobody has reviewed pacing scene by scene.

## What the second film added

On 2026-11-13 a second film was built by this playbook, for Stash: `src/concepts/practice/stash/reel/` (prefix `sx`), recorded in `docs/portfolio-stash-reel.md`. Section 11's steps were followed from the copy. What it tried that the Gisted film had not, and what it showed:

- **A light stage works**, and so does changing the stage from scene to scene. Each scene names a ground (the brand's lime, paper, or black); the WebGL layer draws the ground and wipes to the next with halftone dots, and without WebGL the stage's CSS background colour does the same job. Dots are drawn with ordinary blending, in ink on the light grounds and in the spot colour on black. See `groundAt` in its `timeline.ts` and the backdrop shader in its `particles.ts`.
- **Let the product's design decide the stage.** Stash's design doc has two voices, the person's objects on paper and the machine in black, so the product scenes are on paper and the under-the-hood scene is on black. The Gisted film's dark stage was that film's own choice, not a rule.
- **Carry over the product's motion as well as its look.** Stash's turning cursor, decrypting text and pictures that resolve from pixels were each rewritten as a function of the clock (`Spinner`, `Decrypt`, `PixelImage` in its `art.tsx`). A canvas painted from `useFrame` scrubs like anything else, provided it redraws from the time alone.
- **Captions that read on any ground**: a black tag over a white slip with an ink border, in place of text over a gradient.
- **The first-row mistake happened again**, twice, in a film written by someone who knew about it: `style={{…}}` beside `{...a(…)}`. Its test file now scans the scene sources for that pattern (the last test in `scripts/portfolio/test_stash_reel.mjs`). Copy that test.
- **The caption-rate test was in from the start**, and the under-the-hood scene was sized to its captions: five captions in 21.5 seconds.
- **The source question from section 3 was real.** The folder the owner pointed at held ten worktrees and no code of its own; the newest was found by commit date, and the record says which one was used.
- **A commercial typeface came up** (PP Neue Montreal). It was copied in for local work and listed as the owner's decision before any deploy.

Still true: the engine is not extracted. There are now two copies (`gr` and `sx`), which is the point at which section 11 says to pull it out.

## Done means

- [ ] A goals note is in the repository, and each scene names the goal it serves.
- [ ] A table maps every claim the film makes (what the system does, numbers, named technologies, who built it) to its source.
- [ ] Timeline tests pass: contiguity, camera continuity, invisible cuts, choreography, on-screen numbers.
- [ ] Type-check and lint add nothing, and a production build passes.
- [ ] Frames were looked at: each scene's beats, both sides of every boundary, every press.
- [ ] Every press and every measured overlay was confirmed from live playback.
- [ ] A real-time run recorded frame rate and long frames; end, replay, chapters, keys and off-screen pause behave.
- [ ] No caption runs faster than 20 characters a second, kicker included, and a test asserts it (Appendix B).
- [ ] Reduced motion, a phone width, a short wide window, the fullscreen layout and WebGL-off all work.
- [ ] At least one other engine was checked, and no run produced console errors or warnings (three.js's own, with WebGL off, aside).
- [ ] An independent review was done, and its findings were fixed and re-checked.
- [ ] The report says what was not checked, lists the decisions made for the owner, and asks them to watch it.
- [ ] Nothing was committed, pushed or deployed without being asked.

## Glossary

| Term | Meaning here |
| --- | --- |
| Film | The whole walkthrough. The code folder calls it a reel. |
| Clock | Seconds since the start of the film: the only input to every frame. |
| Scene-local time | The clock minus the scene's start. Every time inside a scene is written this way. |
| Scrubbed | Positioned by the clock rather than played: a paused CSS animation whose delay is its start time minus the clock. |
| Canvas | The fixed 1280 × 720 coordinate space everything is composed in. "Canvas px" are its units. It is not the `<canvas>` element, which is called the WebGL element here. |
| Stage | The element on the page that shows the canvas, at whatever size and shape the page gives it. A "dark stage" is one whose backdrop is dark. |
| World, HUD | The part of a scene the camera moves, and the part that stays fixed to the screen. |
| Spot | An element tagged `data-spot="name"` that the pointer can aim at. |
| Formation | One arrangement of the particles: a word, a mark, a page of text, a scatter. |
| Segment | One move of the particles from formation A to formation B, between two times. |
| Poster | What shows before play is pressed. |
| Still | The one frame per scene shown when motion is reduced. |
| Cut on a solid color | A cut made while one color fills the frame on both sides, so it is not seen as a cut. |
| Kicker | The short uppercase label above a caption's sentence, such as "01 · Paste". |
| Doodle | One of the product's hand-drawn line illustrations. |
| Mark | The symbol in the logo. Gisted's is a four-pointed sparkle. |

## Appendix A: the checking scripts

Five small scripts and a contact-sheet maker. They drive any film whose player keeps the class names listed at the top of `reel.mjs`. Save each under the name in its heading, in the scratch folder from §9.

#### `reel.mjs`

```js
// Shared by the scripts below. They drive any film whose player keeps these class names, with its own prefix P (--p, default gr):
//   .P-start             the poster's play button
//   .P-controls button   the first one toggles play; its aria-label is Pause while playing, Play when paused, Replay at the end
//   .P-track input       a range input whose value is the clock in seconds and whose max is the film's length
//   .P-stage             the picture
//   .P-chapters button   one per scene, aria-pressed="true" on the current one
//   .P-world             the layer the camera moves, 1280 canvas px wide before its transform (where.mjs)
//   .P-theater           stage plus controls; the class is-full lays it out as full screen (--full)
import { chromium, webkit, firefox } from 'playwright-core';

export function options(argv = process.argv.slice(2)) {
  const opt = {}, rest = [];
  for (const arg of argv) {
    if (!arg.startsWith('--')) { rest.push(arg); continue; }
    const i = arg.indexOf('=');
    if (i < 0) opt[arg.slice(2)] = '1'; else opt[arg.slice(2, i)] = arg.slice(i + 1);
  }
  if (!opt.url) { console.error('--url=<the page the film is on> is required'); process.exit(2); }
  return { opt, rest };
}

export async function open(opt) {
  const engine = opt.browser || 'chrome';
  // A real GPU for headless Chrome; without one WebGL runs in software and frame rates mean nothing.
  // Only the macOS flags have been run. Elsewhere, check that WebGL is hardware-accelerated before trusting a frame rate.
  const gpu = ['--ignore-gpu-blocklist', '--enable-gpu', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : [])];
  const args = opt.nogl ? ['--disable-gpu', '--disable-3d-apis'] : gpu;
  const browser = engine === 'webkit' ? await webkit.launch() : engine === 'firefox' ? await firefox.launch() : await chromium.launch({ channel: 'chrome', args });
  const page = await browser.newPage({
    viewport: { width: Number(opt.w || 1440), height: Number(opt.h || 900) },
    deviceScaleFactor: Number(opt.dsf || 1),
    reducedMotion: opt.reduced ? 'reduce' : 'no-preference',
    ...(opt.mobile ? { isMobile: true, hasTouch: true } : {}),
  });
  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text().slice(0, 400)}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 600)}`));
  const p = opt.p || 'gr';
  const sel = { start: `.${p}-start`, toggle: `.${p}-controls button`, range: `.${p}-track input`, stage: `.${p}-stage`, chapters: `.${p}-chapters button`, world: `.${p}-world`, theater: `.${p}-theater` };
  await page.goto(opt.url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(sel.start, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);   // the lazily loaded WebGL layer
  return {
    browser, page, sel, logs,
    /** Press play on the poster. The film is then playing, or on its first still when motion is reduced. */
    start: async () => {
      await page.click(sel.start);
      await page.waitForSelector(sel.toggle);
      // The slider moves in steps (0.05 s in the reference), so a seek to 47.22 would land on 47.2 and the clock would read back rounded.
      await page.evaluate((s) => { document.querySelector(s).step = 'any'; }, sel.range);
    },
    toggle: () => page.click(sel.toggle),
    label: () => page.evaluate((s) => document.querySelector(s)?.getAttribute('aria-label'), sel.toggle),
    time: () => page.evaluate((s) => Number(document.querySelector(s)?.value ?? -1), sel.range),
    /** Move the film to second `t`, the way dragging the slider does. */
    seek: (t) => page.evaluate(([s, time]) => {
      const input = document.querySelector(s);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(time));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, [sel.range, t]),
    report: () => console.log(logs.length ? logs.join('\n') : 'no console errors or warnings'),
  };
}
```

#### `shoot.mjs`

```js
// Exact frames by seeking: node shoot.mjs --url=<page> [--out=frames --w=1440 --h=900 --dsf=1 --browser=webkit|firefox
//   --reduced --mobile --nogl --full --poster --wait=320 --sel=<css to photograph> --p=<prefix>] t1 t2 …
import fs from 'node:fs';
import { open, options } from './reel.mjs';

const { opt, rest } = options();
const out = opt.out || 'frames';
fs.mkdirSync(out, { recursive: true });
const reel = await open(opt);
const { page, sel } = reel;
if (opt.poster) await page.locator(sel.stage).screenshot({ path: `${out}/poster.png` });
const times = rest.map(Number);
if (times.length) {
  await reel.start();
  if (!opt.reduced) await reel.toggle();   // pause, so frames come from seeks alone
  // Headless Chrome cannot enter real fullscreen, so lay the theater out the way :fullscreen would.
  if (opt.full) await page.evaluate((s) => {
    const theater = document.querySelector(s);
    theater.classList.add('is-full');
    Object.assign(theater.style, { position: 'fixed', inset: '0', zIndex: '99', width: '100vw', height: '100vh' });
  }, sel.theater);
  for (const t of times) {
    await reel.seek(t);
    await page.waitForTimeout(Number(opt.wait || 320));
    const path = `${out}/t-${t.toFixed(2).padStart(6, '0')}.png`;
    if (opt.full) await page.screenshot({ path }); else await page.locator(opt.sel || sel.stage).screenshot({ path });
  }
}
console.log(JSON.stringify(await page.evaluate((s) => {
  const stage = document.querySelector(s), gl = stage?.querySelector('canvas');
  return { stage: stage && [stage.clientWidth, stage.clientHeight], canvas: gl && [gl.width, gl.height], canvasHidden: gl ? gl.hidden : null };
}, sel.stage)));
reel.report();
await reel.browser.close();
```

#### `live.mjs`

```js
// Frames from live playback, with no seek at the moment of capture:
//   node live.mjs --url=<page> [--out=live] <seekTo>:<captureAt>[,<captureAt>…] …
// It seeks to a point before the action, lets the film run, and photographs it as the clock passes each time.
// The photograph lands a few hundredths of a second after the time asked for; the script prints the time it got.
import fs from 'node:fs';
import { open, options } from './reel.mjs';

const { opt, rest } = options();
const out = opt.out || 'live';
fs.mkdirSync(out, { recursive: true });
const reel = await open(opt);
const { page, sel } = reel;
await reel.start();
for (const run of rest) {
  const [from, list] = run.split(':');
  await reel.seek(Number(from));
  if (await reel.label() !== 'Pause') await reel.toggle();   // make sure it is playing
  for (const target of list.split(',').map(Number)) {
    await page.waitForFunction(([s, t]) => Number(document.querySelector(s).value) >= t, [sel.range, target], { polling: 'raf', timeout: 60000 });
    await reel.toggle();                                     // freeze on this live frame, then photograph it
    const got = await reel.time();
    await page.locator(sel.stage).screenshot({ path: `${out}/live-${target.toFixed(2).padStart(6, '0')}.png` });
    console.log(`asked ${target} got ${got.toFixed(2)}`);
    await reel.toggle();
  }
}
reel.report();
await reel.browser.close();
```

#### `play.mjs`

```js
// A real-time run: frame rate in 3 s windows, then the controls. It takes the film's length plus about 15 s.
//   node play.mjs --url=<page> [--dsf=2 --browser=webkit --seconds=<stop early>]
import { open, options } from './reel.mjs';

const { opt } = options();
const reel = await open({ dsf: '2', ...opt });
const { page, sel } = reel;
await page.evaluate(() => {
  window.__f = { n: 0, long: 0, worst: 0, last: performance.now() };
  const tick = (now) => { const f = window.__f, dt = now - f.last; f.last = now; f.n++; if (dt > 34) f.long++; if (dt > f.worst) f.worst = dt; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
const sample = () => page.evaluate(() => { const f = window.__f, out = { n: f.n, long: f.long, worst: Math.round(f.worst) }; f.n = 0; f.long = 0; f.worst = 0; return out; });
const chapter = () => page.evaluate((s) => document.querySelector(`${s}[aria-pressed=true]`)?.textContent ?? '', sel.chapters);

await reel.start();
const total = await page.evaluate((s) => Number(document.querySelector(s).max), sel.range);
const stopAt = Math.min(total, Number(opt.seconds || total));
await sample();
const began = Date.now();
for (;;) {
  await page.waitForTimeout(3000);
  const f = await sample(), t = await reel.time();
  console.log(`${t.toFixed(1).padStart(6)}s  ${(await chapter()).padEnd(16)} fps ${(f.n / 3).toFixed(0).padStart(3)}  frames over 34 ms ${String(f.long).padStart(2)}  worst ${f.worst} ms`);
  if (t >= stopAt - 0.05 || Date.now() - began > (stopAt + 20) * 1000) break;
}
if (await reel.time() >= total - 0.05) {
  console.log('at the end, the button says:', await reel.label());
  await reel.toggle(); await page.waitForTimeout(900);
  console.log('replay: time', (await reel.time()).toFixed(2), '· button:', await reel.label());
}
const pick = Math.min(4, await page.locator(sel.chapters).count());
await page.click(`${sel.chapters}:nth-child(${pick})`); await page.waitForTimeout(700);
console.log(`chapter ${pick}: time`, (await reel.time()).toFixed(2), '· chapter:', await chapter());
await page.focus(sel.stage);
await page.keyboard.press('Space'); await page.waitForTimeout(300);
const paused = await reel.time(); await page.waitForTimeout(500);
console.log('space pauses:', (await reel.time()) === paused);
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
console.log('right arrow moves', ((await reel.time()) - paused).toFixed(2), 's');
await page.keyboard.press('Space'); await page.waitForTimeout(300);
// Needs a page long enough that its bottom is below the stage.
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(600);
const away = await reel.time(); await page.waitForTimeout(600);
console.log('pauses when scrolled away:', (await reel.time()) === away);
reel.report();
await reel.browser.close();
```

#### `where.mjs`

```js
// Canvas coordinates of things at a moment, for pointer waypoints and pulses:
//   node where.mjs --url=<page> [--canvas=1280] <time> <data-spot name or .selector> [<time> <target> …]
import { open, options } from './reel.mjs';

const { opt, rest } = options();
const reel = await open(opt);
await reel.start();
await reel.toggle();
for (let i = 0; i < rest.length; i += 2) {
  await reel.seek(Number(rest[i]));
  await reel.page.waitForTimeout(320);
  const found = await reel.page.evaluate(([worldSel, target, width]) => {
    const worlds = document.querySelectorAll(worldSel), world = worlds[worlds.length - 1];
    const el = world?.querySelector(target.startsWith('.') ? target : `[data-spot="${target}"]`);
    if (!el) return null;
    const frame = world.getBoundingClientRect(), box = el.getBoundingClientRect(), k = frame.width / width;
    return { x: Math.round((box.left + box.width / 2 - frame.left) / k), y: Math.round((box.top + box.height / 2 - frame.top) / k), w: Math.round(box.width / k), h: Math.round(box.height / k) };
  }, [reel.sel.world, rest[i + 1], Number(opt.canvas || 1280)]);
  console.log(rest[i], rest[i + 1], JSON.stringify(found));
}
await reel.browser.close();
```

#### `sheet.py`

```python
# A contact sheet: python3 sheet.py out.png <columns> <width of each frame> frame1.png frame2.png …
import os, sys
from PIL import Image, ImageDraw

out, cols, width = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
files = sys.argv[4:]
images = [Image.open(f).convert('RGB') for f in files]
height = round(images[0].height * width / images[0].width)
rows = (len(images) + cols - 1) // cols
sheet = Image.new('RGB', (cols * width + (cols - 1) * 6, rows * height + (rows - 1) * 6), (40, 40, 40))
draw = ImageDraw.Draw(sheet)
for i, (image, f) in enumerate(zip(images, files)):
    x, y = (i % cols) * (width + 6), (i // cols) * (height + 6)
    sheet.paste(image.resize((width, height), Image.LANCZOS), (x, y))
    label = os.path.splitext(os.path.basename(f))[0]
    draw.rectangle((x, y, x + 10 + 6 * len(label), y + 18), fill=(0, 0, 0))
    draw.text((x + 5, y + 3), label, fill=(255, 255, 0))
sheet.save(out)
print(out, sheet.size)
```

## Appendix B: testing the timeline without a browser

The timeline module imports nothing, so a test can transpile it in memory and load it. The `require` it is given fails on any import, which keeps the module pure.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', code)((name) => assert.fail(`Unexpected import: ${name}`), module, module.exports);
  return module.exports;
}
const T = load('src/concepts/practice/gisted/reel/timeline.ts');

test('particles only change formation abruptly while they are invisible', () => {
  let previous = T.particlesAt(0);
  for (let t = 1 / 60; t <= T.TOTAL; t += 1 / 60) {
    const now = T.particlesAt(t);
    // A cut: the formation in hand is neither where the last frame was nor where it was heading.
    if (now.a !== previous.a && now.a !== previous.b) assert.ok(previous.alpha < 0.01 && now.alpha < 0.01, `visible cut at ${t.toFixed(2)}`);
    previous = now;
  }
});
```

That example needs a particle layer. The other tests are in `scripts/portfolio/test_gisted_reel.mjs`; §4.1 lists what they assert, and §11 says which to keep for a film that has no particles yet.

One test that file does not have, and every new film should. It counts the kicker with the sentence. The Gisted film would fail it, in the pipeline scene and once in Hear back (§13).

```js
test('captions stay up long enough to read', () => {
  const tooFast = [];
  for (const scene of T.SCENES) {
    scene.captions.forEach((caption, i) => {
      const until = i + 1 < scene.captions.length ? scene.captions[i + 1].at : scene.dur;
      const rate = (caption.kicker.length + caption.text.length) / (until - caption.at);
      if (rate > 20) tooFast.push(`${scene.id} at ${caption.at}: ${rate.toFixed(0)} characters a second`);
    });
  }
  assert.deepEqual(tooFast, []);
});
```

## Appendix C: briefing the independent reviewer

A second agent that has not seen the build reads the code cold. Here it took about eight minutes and found the two real defects. What made the brief work:

1. **Say what the thing is**, in two sentences, and list each file with its role in one line.
2. **State the core technique outright** (scrubbed animations, one clock, measured pointers), so the reviewer judges it instead of rediscovering it.
3. **Say what is already verified**, so that time is not spent re-proving it. Give the facts, not your conclusions about quality.
4. **Give a hunting list by area**: lifecycle and leaks, store subscriptions, the pointer's measuring, timeline math and anything in the scenes that disagrees with it, GLSL and buffer mismatches, CSS selectors against the markup and against the host's stylesheet, accessibility and reduced motion.
5. **Ask for a concrete failure scenario** with file and line for each finding, and a confidence.
6. **Ask which areas were examined and found clean**, so you know the coverage.
7. **Make it read-only.**

In a rig-managed session, use the rig's own checker and queue handoff, as the workspace's `AGENTS.md` describes. A plain subagent was used here because the session was not rig-managed.

Reproduce each finding before fixing it. The pointer bug was confirmed with `live.mjs` first, which is how it became clear that every earlier frame capture had been unable to show it.
