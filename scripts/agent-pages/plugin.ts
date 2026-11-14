import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { loadSiteData } from './data.ts';
import type { SiteData } from './pages.ts';
import { renderSite } from './render.ts';

/**
 * After each production build, writes the agent-readable pages into the output folder from the live CMS data.
 * Vercel serves those files ahead of the SPA rewrite in vercel.json, so the CMS stays the source and a deploy refreshes them.
 */
export function agentPages({ load = loadSiteData }: { load?: () => Promise<SiteData> } = {}): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'agent-pages',
    configResolved(resolved) { config = resolved; },
    // writeBundle runs only after Vite has written a successful build (closeBundle also runs after failures),
    // so a build that fails on its own reports its own error and never reads the CMS.
    async writeBundle(options) {
      const outDir = path.resolve(config.root, options.dir ?? config.build.outDir);
      const files = renderSite(await load(), await readFile(path.join(outDir, 'index.html'), 'utf8'));
      for (const file of files) {
        const target = path.resolve(outDir, file.path);
        if (!target.startsWith(outDir + path.sep)) throw new Error(`agent-pages: refusing to write outside ${outDir}: ${file.path}`);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, file.contents);
      }
      config.logger.info(`agent-pages: wrote ${files.length} files for AI agents (pages, Markdown mirrors, llms.txt, llms-full.txt, sitemap.xml)`);
    },
    configurePreviewServer(server) {
      // Vercel serves /project/<id> from project/<id>/index.html; `vite preview` only looks for project/<id>.html.
      const outDir = path.resolve(server.config.root, server.config.build.outDir);
      server.middlewares.use((req, _res, next) => {
        const [pathname, query] = (req.url ?? '/').split('?');
        try {
          const page = path.join(outDir, decodeURIComponent(pathname), 'index.html');
          if (pathname !== '/' && !path.extname(pathname) && page.startsWith(outDir + path.sep) && existsSync(page)) {
            req.url = `${pathname.replace(/\/$/, '')}/index.html${query ? `?${query}` : ''}`;
          }
        } catch { /* a malformed URL falls through to Vite's own handling */ }
        next();
      });
    },
  };
}
