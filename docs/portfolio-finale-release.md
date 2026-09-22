# Published wearables and finale refinement

The user reviewed the local preview and approved publishing: “love it! let's publish”. The release includes the conceptual smartwatch and robotic arm, consistent pearly-white particles, the clearer records-to-conversation visual for Noodle, and the connected planet / helix / intelligence montage ending in five dissipating question marks.

- Production source: `cd4775929c58e9df21b91e8c59a37b3a017d8055` on `wdzierson-org-1/shimmer-project-showcase` branch `main`. Implementation is `c87dd46`; the final commit records approval.
- Vercel deployment: `dpl_9zPZs5Rrxkmj2ySgEQMF7QMcR2w1`, status Ready, target production.
- Deployment URL: https://shimmer-project-showcase-jmgv3el3p-wdzierson-s-team.vercel.app
- Live aliases: https://dzierson.com and https://www.dzierson.com
- Vercel automatically built and promoted this deployment after the production branch push; no separate manual deployment was necessary.
- Both domains returned HTTP 200 and the approved entry `/assets/index-D8pKPCK_.js`. Six CSS/JavaScript assets on each host matched SHA-256 hashes from the checked local build, including `JourneyScene-Be5frroL.js`.
- TypeScript, focused ESLint, the production build, and four timeline tests passed before release. The user reviewed playback; automated browser playback remained unavailable.
- Immediate rollback: `20ca91e`, deployment `dpl_2D9jegMrccqyzz4A5R84ocmZK7su`, https://shimmer-project-showcase-mwwmzj9tm-wdzierson-s-team.vercel.app.

The active source worktree remains `/private/tmp/shimmer-dusk-fireflies` on local branch `preview-wearables-robotics`; its committed source is now published. The main workspace remains an older, independently modified prototype and should not be reset or used as the release source.
