# Published Career navigation and Noodle homepage

The user reviewed the Noodle reconstruction and inline gallery, then requested: “let's check this in and push it.”

- Production source: `21f67b4` on `wdzierson-org-1/shimmer-project-showcase`, branch `main`. Implementation commits: `906cc1b` and `52689b8`.
- Vercel deployment: `dpl_8L92hJbPKZE8V1fJDKKJRSWqNMeF`, Ready, production.
- Deployment URL: https://shimmer-project-showcase-ril20i1a5-wdzierson-s-team.vercel.app
- Live: https://dzierson.com and https://www.dzierson.com
- Career: https://dzierson.com/#career
- Noodle: https://dzierson.com/#case=e7149d46-fad6-477b-a91c-77e76723df7d

The release adds Career between All work and About, recreates Noodle's homepage using HTML/CSS and original artwork, and shows the existing project gallery directly below it. The duplicate homepage screenshot is excluded; the other nine media items retain their saved order.

Vercel built and promoted the release automatically after the production push. Both domains returned HTTP 200 with `/assets/index-CR90s0Ex.js`. All 27 checked assets matched SHA-256 hashes from the validated local build, including the Noodle component/CSS, font, SVG artwork, icons, and video posters. TypeScript, focused ESLint, production build, route regressions, and targeted markup/interaction checks passed during implementation; automated browser verification remained unavailable.

Immediate rollback: `cd47759`, deployment `dpl_9zPZs5Rrxkmj2ySgEQMF7QMcR2w1`, https://shimmer-project-showcase-jmgv3el3p-wdzierson-s-team.vercel.app.

Active source remains in `/private/tmp/shimmer-dusk-fireflies`, local branch `preview-career-noodle`, clean at the published commit. The primary workspace is an older independently modified prototype; do not reset it or use it as the release source.
