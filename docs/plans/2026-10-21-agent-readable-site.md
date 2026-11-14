# Agent-Readable Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every public portfolio URL returns its real content in the HTML the server sends, so AI fetchers and other non-browser readers see the bio, case studies, experience, and writing instead of an empty shell.

**Architecture:** A Vite build plugin reads the same Supabase data the site reads at runtime, renders one Markdown document per page, and writes static HTML (Markdown rendered into `#root`, hidden from JavaScript visitors and replaced when React mounts), `.md` mirrors, `llms.txt`, `llms-full.txt`, and `sitemap.xml` into `dist/`. Vercel serves those files before its catch-all rewrite. Case studies, essays, and the career page move from hash routes to real paths so each can be fetched on its own.

**Tech Stack:** Vite 5 plugin API, `@supabase/supabase-js`, `marked` 16 (both already dependencies), `node:test` with Node's native TypeScript stripping.

**Spec:** The proposal approved in conversation on 2026-10-21 (strategies 1–5 plus real case-study URLs). Owner constraints: the Supabase CMS and admin panel stay intact and authoritative; nothing is published or deployed until the owner checks the site locally.

## Global Constraints

- No Supabase schema, RLS, edge-function, or admin-panel changes. Content edits keep flowing through the admin panel.
- No new dependencies. No `vercel.json` changes.
- Visible text of every existing view stays identical for browser visitors; only URLs change (`/project/<id>`, `/essay/<id>`, `/career`).
- Old `/#case=<id>`, `/#essay=<id>`, `/#career…` links keep working.
- Unlisted projects get a direct `noindex` page and are excluded from the homepage copy, `llms.txt`, `llms-full.txt`, and `sitemap.xml`.
- Agent copy contains only what the site already shows plus `site_settings.about_bio` (and résumé/calendar URLs when set). No WillBot background entries.
- Canonical origin stays `https://dzierson.com`, matching existing code.
- The build fails loudly if Supabase data can't load or no listed projects come back.
- Agent copy refreshes on each build (`vercel --prod`); the browser site keeps reading Supabase live.
- No commits or deploys until the owner approves.

## Review Focus

- A link copied before this change (`/#case=<id>`) must open that case and show `/project/<id>` in the address bar — test in `test_routes.mjs`.
- Back/forward between home, a case, the archive, and the career page must restore each view — browser check in Task 5.
- A project created in the admin after the last deploy must still open at `/project/<id>` (SPA fallback) — browser check in Task 5.
- CMS text containing HTML, `<script>`, or `javascript:` links must render inert in generated pages — test in `test_agent_pages.mjs`.
- JavaScript visitors must never see the agent copy, and the admin/login pages must still render — browser check in Task 5.

---

### Task 1: Shared portfolio data

**Files:**
- Create: `src/concepts/practice/profile.ts` (site/person identity, hero, practice lenses, writing, career copy, roles, brands, specializations, `pageTitle`)
- Create: `src/concepts/practice/projectData.ts` (types, `PROJECT_SELECT`, `normalizeProject`, `cover`, `featuredIds`, `featuredCopy`)
- Modify: `Practice.tsx`, `Experience.tsx`, `projects.ts`, `publications.ts` (add `medium`)

**Interfaces — Produces:** `site.origin/name/title/description`, `person.*`, `pageTitle(name?: string): string`, `roles: Role[]`, `brands: Brand[]`, `specializations: string[]`, `normalizeProject(row: ProjectRow): PortfolioProject`. These files import nothing (or only each other with explicit `.ts` extensions) so the build plugin and Node tests can load them.

- [ ] Move copy and pure helpers; keep JSX output identical.
- [ ] Verify: rendered text of home, case, career, archive, and essay views matches the baseline build (text diff).

### Task 2: Path-based portfolio routes

**Files:**
- Create: `src/concepts/practice/routes.ts`
- Modify: `src/portfolio-route.ts`, `Practice.tsx`, `Experience.tsx`, `chat/sources.ts`, `dashboard/RiskDashboard.tsx`, `FloatingTerminal.tsx`
- Test: `scripts/portfolio/test_routes.mjs`

**Interfaces — Produces:** `routeFromLocation(pathname: string, hash: string): string`, `urlForRoute(route: string): string`, `caseUrl(id: string): string`, `essayUrl(id: string): string`.

- [ ] Tests: `/project/x` → `case=x`; `/essay/x` → `essay=x`; `/career` → `career`; `/career#google` → `career=google`; `/` + `#projects` → `projects`; `urlForRoute` round-trips each; `portfolioDestination('/', '', '#case=abc')` → `/project/abc`; `/#essay=abc` → `/essay/abc`; `/#career=all` → `/career`; `/project/abc/` → `/project/abc`; CMS paths still `null`.
- [ ] Implement; nav hrefs become absolute (`/#projects`, `/career`), case links `/project/<id>`, Ask AI citations and the dashboard share link use path URLs, the terminal's archive link uses a callback.

### Task 3: Agent page renderer

**Files:**
- Create: `scripts/agent-pages/text.ts` (escaping, Markdown→HTML, summaries), `scripts/agent-pages/pages.ts` (page models + JSON-LD), `scripts/agent-pages/render.ts` (template injection, llms files, sitemap)
- Test: `scripts/portfolio/test_agent_pages.mjs`

**Interfaces — Produces:** `type SiteData = { projects: AgentProject[]; essays: Essay[]; settings: SiteSettings }`, `renderSite(data: SiteData, template: string): { path: string; contents: string }[]`.

- [ ] Tests with fixture data (two listed projects, one unlisted, one essay): expected file list; homepage contains name, role, 25+ years, bio, listed titles linked to `/project/<id>`, no unlisted title; case page title/canonical/og:image/`noindex` only when unlisted; JSON-LD parses (`Person.jobTitle`, `CreativeWork.name`); `llms.txt` lists listed `.md` links only; sitemap excludes unlisted; `<script>` in a title and raw HTML / `javascript:` in Markdown are inert; a template without markers throws.

### Task 4: Build integration

**Files:**
- Create: `scripts/agent-pages/data.ts` (`loadSiteData(): Promise<SiteData>`), `scripts/agent-pages/plugin.ts` (`agentPages(): Plugin`)
- Modify: `vite.config.ts`, `index.html` (`<!-- page-meta -->` markers), `public/robots.txt` (Sitemap line), `tsconfig.node.json` (include plugin)

- [ ] `npm run build` writes pages; a missing marker or empty data fails the build.
- [ ] `vite preview` maps `/project/<id>` to `project/<id>/index.html`, matching Vercel's directory index.

### Task 5: Verification and record

- [ ] Agent view: `curl -A GPTBot` against `vite preview` returns hundreds of words per page.
- [ ] Browser view: text diff against baseline; legacy hash links; back/forward; new-project fallback; admin login renders; agent copy removed after mount.
- [ ] Lint and typecheck touched files; run all `scripts/portfolio` tests.
- [ ] Independent review of the full diff; record in `docs/portfolio-agent-readable-preview.md`.
