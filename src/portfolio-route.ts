import { routeFromLocation, urlForRoute } from './concepts/practice/routes.ts';

/** Preserve existing project links while making the approved portfolio the root experience. */
export function portfolioDestination(pathname: string, search = '', hash = ''): string | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/projects') return `/${search}#projects`;
  if (path === '/about') return `/${search}#practice`;
  if (path !== '/' && path !== '/practice.html' && path !== '/career' && !/^\/(project|essay)\/[\w-]+$/.test(path)) return null;
  // Links shared before cases had paths (#case=…, #essay=…, #career) move to their shareable path.
  const url = urlForRoute(routeFromLocation(path === '/practice.html' ? '/' : path, hash)), cut = url.indexOf('#');
  return cut < 0 ? `${url}${search}` : `${url.slice(0, cut)}${search}${url.slice(cut)}`;
}
