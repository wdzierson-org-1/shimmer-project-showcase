# Portfolio Redesign: Cinematic Craft

## Problem
The chatbot-as-homepage approach is dated. No project work visible on landing. Images unoptimized. Navigation uses hard reloads. The site doesn't reflect the quality of the work it showcases.

## Direction
Scroll-driven editorial homepage with 4 featured projects. Dark hero, bold typography (PP Editorial New + PP Mori), tasteful entrance animations. Replace chatbot with ⌘K command palette powered by existing RAG pipeline.

## Featured Projects (ordered)
1. Stash — self-started, live product
2. Knowledge Search AI — shipped at Included Health
3. weOS — self-started project
4. Included Health Multimodal AI — shipped

## Homepage Structure
1. **Dark hero** — full viewport, name in Editorial ultralight ~120px, "I design and build software." in Mori
2. **Featured projects** — scroll-revealed editorial spreads, alternating layouts, spring-physics animations
3. **About signal** — brief positioning, social proof, GitHub, contact
4. **⌘K palette** — persistent, RAG-powered, context-aware

## Technical Fixes
- React Router navigate() instead of window.location.href
- Supabase image transforms for thumbnails
- Lazy loading images
- Remove debug console.logs
- Per-page title/meta

## Visual References
- weOS login: dark, atmospheric, dimensional
- Bernard of Hollywood: massive imagery, editorial typography
- Stash landing: serif + italic headlines, floating UI, confident copy
- ThisIsMe: rich mixed-media, information density

## Color
- Dark hero: deep charcoal (#0a0a0f)
- Content: warm off-white (#f5f2ed)
- Accent: muted warm tone
- PP Editorial New: headings, ultralight display
- PP Mori: body, UI, extralight captions
