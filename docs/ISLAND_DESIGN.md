# Island Design — Decisions & Context

> This document captures the architecture, narrative intent, and implementation decisions
> for the interactive 3D island game on the homepage of will.dzierson.com.
> It exists so that Claude / Cursor can pick up context quickly in any future session.

---

## 1. What the island is

A Three.js isometric 3D game embedded in the hero section of the portfolio.
The player (a voxel character) explores a small island whose **huts represent career chapters**.
Entering a hut opens a "villa book" — a full-screen overlay with narrative intro + project carousel
pulled live from Supabase.

The island is procedurally built: grass/sand/path tiles, water with a GLSL shader, animated clouds,
NPCs, decorations (trees, flowers, ferns, mushrooms, crystals). No game engine — pure Three.js.

---

## 2. Career arc → hut mapping

Will's career has four distinct acts, plus a forward-looking "Now" hut:

| # | Hut Name | Period | Companies | DB `client` patterns | Color |
|---|----------|--------|-----------|----------------------|-------|
| 1 | The Foundation | 2007–2014 | Google, Gigwalk | `Google`, `Gigwalk` | `#f59b00` warm amber |
| 2 | The Institution Builder | 2014–2022 | Grand Rounds / Included Health | `Grand Rounds`, `Included Health`, `Optum`, `Crescendo` | `#16a8a0` clinical teal |
| 3 | The AI Turn | 2019–2023 | Noodle AI, Obvious Ventures consulting | `GenSynth`, `Founder`, `Personal Project`, `Form Health` | `#8b5cf6` violet |
| 4 | The Builder Era | 2023–Now | Stash, weOS, Included Health (AI), Dash | `Stash`, `Confidential`, `Self-started`, `Self Started` | `#22c55e` electric green |
| 5 | What's Next | Future | TensorZero / agentic AI direction | — (no DB projects yet, curated manually) | `#f5c518` solar gold |

**Decisions recorded:**
- Grand Rounds and Included Health are the **same company** (acquired) — merged into one hut.
- Consulting projects (Crescendo, Optum, Form Health, Bernard of Hollywood, PHC) live **inside act huts**
  as secondary projects, not standalone huts.
- Stickerbooth & ThisIsMe (2010–2011) omitted — too minor.
- The "All Projects" page surfaces everything. The island curates.

---

## 3. Secret easter egg

**Project Ariadne** — knowledge preservation with Vint Cerf — is an unusual, standout credential.
It gets a **hidden cave** positioned east of center, along the main path between huts.
No name label. The NPC (Theo the Historian) stands nearby and hints at it with a cryptic clue. Entering it
opens a special one-page book with the Ariadne narrative and a link to projectariadne.info.

---

## 4. Spatial layout

The island is a 21×21 grid (~21 world units across). Player starts at center (10,10).
Huts arranged for a west→east chronological journey:

```
  NW           N           NE
  [1: Foundation]       [2: Institution]
                [center plaza]
  [3: AI Turn]        [4: Builder Era]
  SW           S           SE
               [5: What's Next]
            (south, slightly elevated)

  [secret cave — east of center, on the main path]
```

Exact grid positions (gx, gz) — 0-indexed, origin top-left:
- Hut 1 (Foundation):        gx=4,  gz=4
- Hut 2 (Institution):       gx=16, gz=4
- Hut 3 (AI Turn):           gx=3,  gz=14
- Hut 4 (Builder Era):       gx=17, gz=13
- Hut 5 (What's Next):       gx=10, gz=17
- Cave (Ariadne easter egg):  gx=13, gz=10  (east of center, between paths)

NPCs:
- Mavi the Guide: center plaza, wx≈-0.5, wz≈-2.5 (gx≈10, gz≈8)
- Theo the Historian: near the cave entrance, wx≈3.8, wz≈1.5 (gx≈14, gz≈12)

---

## 5. Hut architecture (per act)

| Hut | Style | Notes |
|-----|-------|-------|
| Foundation | Clean modernist white cube, flat roof, large windows | Corporate confidence of Big Tech era |
| Institution | Grand columned building, multi-wing, clinical feel | Scale of Grand Rounds/IH — large org |
| AI Turn | Bamboo/organic cylinder, double thatched roof | Exploratory, slightly mysterious, crystals nearby |
| Builder Era | Elevated treehouse on stilts, hexagonal roof, ladder | Active workshop, lights on late |
| What's Next | Lighthouse/tower — tall, beacon at top, looks to horizon | Forward-facing, aspirational |
| Cave | Stone archway, vines, glowing interior | Hidden, not labeled, mysterious |

---

## 6. Villa book content structure

Each villa book has:
- **Intro page**: narrative markdown (in `villaBooks.ts`, hand-authored)
- **Project pages**: live from Supabase, filtered by `clientMatch` array
  - `liveurl` shown as "View full project →" link
  - Video URLs (`.mp4`, `.webm`) auto-detected and played inline
  - Image carousel otherwise

The `clientMatch` field in `VillaBook` is now an **array of strings** (ilike patterns),
allowing multi-company huts.

---

## 7. Music

MP3 audio file hosted on Supabase storage: "A Day in My Life" by Dark Cat.
URL: `https://uilvozcryifnpldfpwiz.supabase.co/storage/v1/object/public/videos/a-day-in-my-life-dark-cat-main-version-32322-02-31.mp3`
Loaded via HTML5 Audio element, looped. Starts muted; user opts in via bottom-right volume button.

---

## 8. NPCs

Two docent characters with branching dialogue:
- **Mavi the Guide** (orange, center) — guides visitors to huts, explains career highlights
- **Theo the Historian** (purple, east-center near cave) — explains the technical construction of the site; hints at the cave

Dialogue system: `NpcChat` component, choice-driven, stops all game input while open.

---

## 9. Known decisions / trade-offs

- The Supabase anon key is in the source — this is intentional (it's a read-only public portfolio DB).
- `clientMatch` uses `ilike` — "Included Health" matches both "Included Health" and "Grand Rounds (Now Included Health)".
- HMR sometimes requires a manual touch to re-trigger — known Vite behavior with large components.
- WebGL doesn't render in headless browser (Playwright / browser-use tool) — screenshots of the hero
  will appear blank. The game works in real browsers. Verify visually in Chrome.

---

## 10. File map

| File | Purpose |
|------|---------|
| `src/components/home/IslandGame.tsx` | Three.js scene, game loop, all 3D geometry |
| `src/components/home/IslandExtras.tsx` | NPCs, music, volume control |
| `src/components/home/VillaBook.tsx` | Book overlay UI, Supabase project fetching |
| `src/components/home/Hero.tsx` | Wrapper: IslandGame + VillaBook |
| `src/lib/villaBooks.ts` | Static villa/hut definitions (narrative content) |
| `src/pages/Index.tsx` | Homepage — Header + Hero + rest of page |
| `docs/ISLAND_DESIGN.md` | **This file** |
