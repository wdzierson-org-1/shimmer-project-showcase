/** Preserve existing project links while making the approved portfolio the root experience. */
export function portfolioDestination(pathname: string, search = '', hash = ''): string | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/' || path === '/practice.html') return `/${search}${hash}`;
  if (path === '/projects') return `/${search}#projects`;
  if (path === '/about') return `/${search}#practice`;
  const project = path.match(/^\/project\/([\w-]+)$/);
  return project ? `/${search}#case=${encodeURIComponent(project[1])}` : null;
}
