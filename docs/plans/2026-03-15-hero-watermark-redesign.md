# Hero Watermark Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Shrink the hero from a full-screen billboard to a compact ~55vh branded frame so work is visible above the fold, with the gradient blob persisting as a small ambient strip as you scroll.

**Architecture:** Modify `Hero.tsx` to reduce height, reposition the name/tagline as a bottom-left wordmark, remove the ambient code overlay and GLSL terminal widget, add a sticky blob strip that persists during scroll. The `Index.tsx` page needs no changes. All animation stays in framer-motion.

**Tech Stack:** React, Framer Motion (`motion`, `useScroll`, `useTransform`, `useInView`), Tailwind CSS, existing `GradientBlob` WebGL component, `timeTheme.ts` for colors.

---

### Task 1: Reduce hero height and reposition name as bottom-left wordmark

**Files:**
- Modify: `src/components/home/Hero.tsx`

**Step 1: Replace the outer container height and sticky section**

Change the outer `div` from `h-[150vh]` to `h-[55vh] min-h-[420px]` and the sticky section from `h-screen` to `h-full`. This removes the scroll-driven sticky behavior entirely — the hero is now just a fixed-height block.

```tsx
// Before
<div ref={containerRef} className="relative h-[150vh]">
  <section className="sticky top-0 h-screen overflow-hidden">

// After
<div ref={containerRef} className="relative h-[55vh] min-h-[420px]">
  <section className="h-full overflow-hidden relative">
```

**Step 2: Remove scroll-driven parallax hooks**

Remove `useScroll`, `useTransform`, `codeY`, `textY`, `terminalY`, `heroOpacity`, `textOpacity`, `terminalOpacity` — they only made sense with the tall sticky layout. Keep `containerRef` for now (can be a plain `div` ref if desired). Remove the `useScroll` import if no longer used.

**Step 3: Remove the ambient code overlay block**

Delete the entire `{/* Ambient code */}` motion.div block (lines with `CODE_LINES.map`).

**Step 4: Remove the ephemeral terminal block**

Delete the entire `{/* Ephemeral terminal */}` motion.div block.

**Step 5: Remove the `CODE_LINES` and `TERMINAL_LINES` constants and `tokenColor` function**

These are no longer rendered. Delete them from the top of the file to keep it clean.

**Step 6: Reposition hero text to bottom-left wordmark**

Replace the centered `motion.div` hero text block with a bottom-left positioned wordmark:

```tsx
{/* Wordmark — bottom-left */}
<motion.div
  className="absolute bottom-8 left-6 md:left-12 z-10 pointer-events-none"
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
>
  <p
    className="font-serif leading-none tracking-tight"
    style={{
      fontSize: 'clamp(1.4rem, 2.2vw, 2rem)',
      fontWeight: 200,
      color: isLight ? 'rgba(0,0,0,0.80)' : 'rgba(255,255,255,0.85)',
    }}
  >
    William Dzierson
  </p>
  <p
    className="mt-1.5 font-sans uppercase tracking-[0.18em] text-[10px]"
    style={{ color: isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)' }}
  >
    Design &amp; Engineering
  </p>
</motion.div>
```

**Step 7: Remove the scroll cue div** (it relied on `textOpacity` and a 150vh scroll distance). Delete the `{/* Scroll cue */}` motion.div.

**Step 8: Verify the bottom gradient fade is still present**

The `{/* Soft bottom edge */}` div should remain — it blends the hero into the content below.

**Step 9: Visual check**

Open `http://localhost:8080/` — the hero should now be roughly half the viewport height, with the gradient blob filling it and the name sitting quietly at the bottom-left. The first project card should be visible or just below the fold.

**Step 10: Commit**

```bash
git add src/components/home/Hero.tsx
git commit -m "feat: reduce hero to compact wordmark layout, remove code overlays"
```

---

### Task 2: Add a persisting ambient blob strip that survives scroll

**Files:**
- Modify: `src/components/home/Hero.tsx`
- Modify: `src/pages/Index.tsx`

**Context:** We want the blob to "shrink and persist" — after the hero, a thin (~80px) full-width ambient strip pins behind the nav and continues to animate as you scroll through the work. This is a separate fixed element that becomes visible once the hero scrolls out of view.

**Step 1: Create an `AmbientStrip` component at the bottom of `Hero.tsx`**

```tsx
export const AmbientStrip = () => {
  const theme = useMemo(() => getTimeTheme(), []);
  const { bgRgb, colorA, colorB, colorC } = theme;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-0 h-[72px] pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <GradientBlob
        className="w-full h-full"
        bgColor={bgRgb}
        colorA={colorA}
        colorB={colorB}
        colorC={colorC}
      />
      {/* Fade edge at bottom of strip */}
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
};
```

**Step 2: Import and render `AmbientStrip` in `Index.tsx`**

```tsx
import Hero, { AmbientStrip } from '@/components/home/Hero';

// Inside the JSX, before <Hero />:
<AmbientStrip />
<Hero />
```

The strip sits at `z-0` so nav (which should be higher z-index) renders above it. The hero's own full-bleed blob renders over it while in view. Once the hero scrolls away, the strip is visible as a soft color accent behind the nav.

**Step 3: Verify strip behavior**

Scroll through the page — a soft `72px` color band at the top should remain visible and keep animating. It should not interfere with nav interaction.

**Step 4: Check nav z-index**

Find the nav component and confirm it has a z-index higher than `0` (e.g., `z-10` or `z-50`). If not, add it.

**Step 5: Commit**

```bash
git add src/components/home/Hero.tsx src/pages/Index.tsx
git commit -m "feat: add persistent ambient blob strip behind nav"
```

---

### Task 3: Polish — entry animation timing and fade transition

**Files:**
- Modify: `src/components/home/Hero.tsx`

**Step 1: Tune blob fade-in**

The `GradientBlob` component currently renders immediately. Wrap it in a `motion.div` with a fast fade-in:

```tsx
<motion.div
  className="absolute inset-0"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.8, ease: 'easeOut' }}
>
  <GradientBlob ... />
</motion.div>
```

**Step 2: Verify the wordmark animation timing**

The wordmark has `delay: 0.2` and `duration: 0.6`. Check that it feels like it resolves before the user's eye finishes scanning — if it feels slow, reduce delay to `0.1`.

**Step 3: Check bottom gradient fade height**

The soft-edge fade div is `h-64`. With the hero now at `55vh`, this may be too tall (covering most of the hero). Reduce to `h-28` or `h-32` so the blob is mostly visible and only the very bottom edge is soft.

**Step 4: Lint check**

```bash
cd /path/to/project && npx tsc --noEmit
```

Fix any TypeScript errors.

**Step 5: Final visual review in browser**

- [ ] Hero is clearly compact — work visible at or near the fold
- [ ] Name reads as a wordmark, not a headline
- [ ] Blob animates on load with a clean fade-in
- [ ] Ambient strip is visible behind nav as you scroll
- [ ] No layout shifts or flash of unstyled content

**Step 6: Commit**

```bash
git add src/components/home/Hero.tsx
git commit -m "polish: hero blob fade-in, wordmark timing, edge fade height"
```
