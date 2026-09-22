# Published SiGuide device hero

The user reviewed the SiGuide refinements and requested: “let's check this in an publish to vercel”.

- Committed source: `7a429f50d5b60bdc50e7fc9e92522fec9b12318b` (`7a429f5`), “Rebuild the SiGuide hero as an animated 3D device”.
- Local branch: `release-siguide-device`, in `/private/tmp/shimmer-dusk-fireflies`.
- Vercel project: `wdzierson-s-team/shimmer-project-showcase`, ID `prj_I0VNyfvivPOi1IuowXYxSyGpJNuI`.
- Vercel deployment: `dpl_CBEs6CET4N4pPG3et1cM5319ohS8`, Ready, production.
- Deployment URL: https://shimmer-project-showcase-4he34viz6-wdzierson-s-team.vercel.app
- Live project: https://dzierson.com/#case=7b4a9961-a088-46f4-bc88-8f0d64589227
- Both https://dzierson.com and https://www.dzierson.com are aliased to the release.

The release adds the modeled SiGuide handheld with studio lighting, molded casing, speaker recesses, reflective glass, and correct WIVID branding. Its 24-second animation moves from schematic to finished device, home menu, tour, map route, and an individual stagecoach object screen. Pause, replay, four direct screen selections, reduced-motion stills, and the original project gallery remain available.

Vercel built and published the committed checkout directly through its CLI. Both live domains serve `/assets/index-BjXgHPZB.js`. All 19 checked assets on each domain match SHA-256 hashes from the validated local production build: 38 successful checks, including the SiGuide JavaScript, CSS, and four original reference assets. TypeScript, focused ESLint, nine sequence/geometry/routing checks, and the production build passed. Browser playback verification remained unavailable.

## GitHub synchronization remains pending

The release commit is saved locally but has not reached `origin/main`. GitHub HTTPS connections reset for Git and its REST API, and SSH on port 22 also resets. SSH over port 443 reaches GitHub; its Ed25519 host fingerprint was verified against [GitHub’s official published fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints), but this environment has no accepted SSH identity (`Permission denied (publickey)`). No global SSH configuration, host trust settings, Git remotes, or credentials were changed.

Once GitHub connectivity is restored, synchronize with:

```sh
git -C /private/tmp/shimmer-dusk-fireflies push origin HEAD:main
```

Use the normal non-force push. If main has advanced, reconcile those changes before retrying. Do not deploy the older main checkout over this release. The local release branch contains the complete committed source.

Immediate rollback: source `21f67b4`, deployment `dpl_8L92hJbPKZE8V1fJDKKJRSWqNMeF`, https://shimmer-project-showcase-ril20i1a5-wdzierson-s-team.vercel.app.

The primary workspace is an older independently modified prototype. It is not the release source and was not reset or deployed. Vercel linking added only ignored deployment metadata and a local OIDC environment file to the release checkout.
