# Portfolio directions

Three independent, interactive art-direction prototypes. They do not import the existing App, connect to Supabase, invoke database setup, or call AI services. Existing application edits are preserved.

Run: `npx vite --config vite.concepts.config.ts`

- http://127.0.0.1:8081/concepts.html?direction=1 — Living Systems
- http://127.0.0.1:8081/concepts.html?direction=2 — Field Notes
- http://127.0.0.1:8081/concepts.html?direction=3 — Orbit

Build: `npx vite build --config vite.concepts.config.ts` (output: `dist/concepts`).

## Recommendation

Living Systems offers the strongest balance of visual identity and direct access to the work. Borrow Lusion's commitment to integrated motion and visual storytelling, scaled to one person's portfolio. The hero should transition into actual project imagery as visitors scroll. The prototype establishes the form and interaction; that production transition is not implemented.

Field Notes is an editorial alternative: big typography, a tactile contour study, and annotated project chapters. It makes the author's judgment more prominent. In a full version, each study should reveal a project constraint, decision, and consequence. It is the lightest direction to maintain.

Orbit preserves the invitation to explore from the platforming game while making work immediately selectable. This prototype provides clickable nodes and an optional index; a full version could connect these to spatial camera transitions and real project relationships. Avoid making navigation depend on game skill or a spatial canvas.

## AI with a specific purpose

- Living Systems: optional brief-to-case-study matching. Show why each case is relevant, cite the case, and support normal browsing when no match exists.
- Field Notes: a bounded, opt-in alternative-constraint experiment inside a documented project. Distinguish generated speculation from the actual design decisions.
- Orbit: propose connections between documented projects, then show the source evidence. Human review should approve the relationship graph before publication.

None of these AI features is connected in this preview. Reading-perspective controls switch authored content. The geometry is procedural, not AI-generated. No user data is sent anywhere by the preview itself.

## Reference research

- https://lusion.co/ — integrated 3D storytelling and interaction. Accessible text was reviewed; browser-based visual inspection was unavailable.
- https://github.com/MengTo/threeui — Community catalog and implementation source.
- https://github.com/MengTo/threeui/tree/main/src/shaders — Liquid Form, Structure Flow, Sketchbook, Woven Cloth, Orbital Sphere, and Constellation Field are candidate studies for a production implementation. Their source was not copied or integrated. The previews use original Canvas 2D parametric geometry and CSS, keeping dependencies unchanged.

The live dzierson.com homepage could not be fetched. Current positioning, links, and fonts come from local source; the brief supplies the world-exploration context. Chapter narratives are explicitly proposed copy, not verified case studies. Before production, use actual project images, roles, outcomes, and approved descriptions.

## Scope and verification

Included: three distinct compositions, shareable direction URLs and browser-history handling, responsive breakpoints, adjustable artwork, pause controls, reduced-motion handling, semantic navigation, inline chapter switching, visible focus styles, skip link, concept notes, and contact/source links.

Not included: final case studies, live AI, full Three.js materials, scroll-camera choreography, analytics, deployment, or integration with the existing project CMS.

Production build and targeted TypeScript/ESLint checks were run. Browser inspection could not run because the browser runtime reported no available browsers. Mobile composition, actual contrast, pointer/touch behavior, and performance should receive visual QA before a chosen direction is shipped.

## Fourth direction: Aspect desktop

The full OS concept is at http://127.0.0.1:8081/os.html. See [its README](os/README.md) for setup, implemented apps, framework provenance, verification, and pending connections. Unlike the first three self-contained studies, it reads public project data and invokes the existing RAG service on question submission.
