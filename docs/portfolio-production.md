# Portfolio production release

The approved portfolio is the root experience at https://dzierson.com. It is built from `src/concepts/practice` by the repository's normal `npm run build` command; the directory name records the design exploration, not a separate deployment.

## Repository and hosting

- GitHub: `wdzierson-org-1/shimmer-project-showcase`, production branch `main`.
- Vercel: `wdzierson-s-team/shimmer-project-showcase`.
- Domains: `dzierson.com` and `www.dzierson.com`.
- Install: `npm ci --legacy-peer-deps`. Build: `npm run build`. Output: `dist`.
- Vercel's existing Node runtime is 22.x. Use a supported Node version locally.

`src/main.tsx` loads the portfolio for public work routes and the existing application for CMS, authentication, content, and unknown routes. Each entry loads its own styles. CMS navigation back to the portfolio performs a full navigation to avoid mixing those styles. Existing `/project/:id`, `/projects`, `/about`, and `/practice.html` links resolve to their corresponding portfolio views. New citations and copied links use the root URL.

The production entry includes the public metadata and no `noindex` directive. The original terminal is loaded only when opened. Lenis is a pinned root dependency, so a clean checkout does not require the earlier OS prototype's nested installation.

## Data and answers

Projects and writing continue to use the existing public Supabase records in project `uilvozcryifnpldfpwiz`. No database migration or CMS content change is part of this release. Public browser configuration is in `src/integrations/supabase/config.ts`; OpenAI credentials remain in the existing Edge Function environment.

The `chat` Edge Function accepts opt-in SSE streaming and retains the original `{ generatedText }` JSON response for terminal callers. The new UI supports either response. Deploy just this function with:

```sh
supabase functions deploy chat --project-ref uilvozcryifnpldfpwiz --use-api --no-verify-jwt
```

The `--no-verify-jwt` flag preserves the function's existing production setting (version 25 before this release); it does not change its access policy. Do not deploy unrelated functions or migrations as part of this frontend release.

## Verification

```sh
npx tsc -p tsconfig.portfolio.json --noEmit
node --test scripts/portfolio/test_chat_stream.mjs scripts/portfolio/test_routes.mjs
npm run build
npm run preview -- --host 127.0.0.1 --port 8082
```

Browser checks cover the root homepage, 21 visible projects, gallery, old project URL compatibility, desktop and mobile layouts, the career story player, lazy CRT terminal and keyboard movement, Ask AI, and the existing admin sign-in. Route verification intercepts the legacy application's schema initialization request rather than performing a schema change.

The build retains size warnings for the optional CRT and legacy CMS bundles. Neither is requested by the public homepage before it is needed.

## Rollback

The previous production deployment is `shimmer-project-showcase-2d9uamhek-wdzierson-s-team.vercel.app` (`dpl_ErL365EuYLD54xfW65hccNCNjDJG`), based on commit `f3e3d8fe68e1e95363e8fd16b71c21bdc25fa7a4`. Vercel can restore that deployment if necessary. A source revert is needed as well if future pushes should keep the previous version.

Earlier `portfolio-*.md` documents describe the local design iterations and their verification at that time. This document supersedes their preview-only build and routing instructions.
