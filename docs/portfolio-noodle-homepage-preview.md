# Career navigation and Noodle homepage reconstruction

Source: `/private/tmp/shimmer-dusk-fireflies`, branch `preview-career-noodle`, continuing from production `cd47759`. The user reviewed the reconstruction and inline gallery, then explicitly approved checking in and pushing this version. The approved implementation is `52689b8`, including the Career navigation and Noodle reconstruction from `906cc1b`. Release through the existing `main` branch and Vercel project.

The top navigation now places **Career** immediately after **All work** and before **About**, with a real `/#career` link and the existing client-side career view. Modified clicks preserve normal new-tab behavior, and the link exposes `aria-current` while visiting the career view.

The Noodle case (`e7149d46-fad6-477b-a91c-77e76723df7d`) opens with a React/CSS reconstruction of https://www.noodleai.app/. Headings and text are native HTML; the original logo, Inter font, line-art SVGs, icons, and high-resolution demo posters are served locally. Feature buttons select the three original mobile demos. Homepage videos load on demand, pause offscreen or on a hidden tab, and are unmounted when their feature is changed. The walkthrough can expand to fullscreen, with a direct video link when fullscreen is unavailable. Per the user's review, the existing project gallery now appears directly beneath the recreated homepage, without an accordion. The original homepage screenshot (`tixziglvmcr.png`) is excluded from this gallery; the other nine media items retain their saved order. The surrounding case description and contribution are unchanged.

The original site's closed-service status is retained, and an archive note identifies the work as historical. No newsletter form or new signup flow is recreated. Original videos stream from noodleai.app; posters and load-error links keep their context available. Asset origins and the Inter license are documented in `public/portfolio/noodle/`.

The reconstruction is loaded only for the Noodle case, including its CSS and font. Container queries adapt it to the available width. The walkthrough poster keeps its 2896×1589 dimensions at 114 KB rather than the original 976 KB PNG.

Validation: focused TypeScript and ESLint; production build; three existing route regressions; server-rendered markup and local asset checks; component callback checks of all three demo selections. The inline gallery was checked against the current public media list to confirm that only the original homepage screenshot is excluded. Reference screenshot and original media were inspected. Automated browser layout/playback verification is unavailable because there is no connected browser; do not treat these checks as browser screenshots or full browser validation.

Preview: http://127.0.0.1:8083/#case=e7149d46-fad6-477b-a91c-77e76723df7d . Career: http://127.0.0.1:8083/#career .

Production before this release: `cd47759`, Vercel deployment `dpl_9zPZs5Rrxkmj2ySgEQMF7QMcR2w1` at https://shimmer-project-showcase-jmgv3el3p-wdzierson-s-team.vercel.app. This is the immediate rollback target.
