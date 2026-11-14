/**
 * Portfolio views live in the URL. Cases, essays, and the career page have shareable paths that servers
 * and AI agents can fetch; every other view stays a hash on the home page. Imports nothing, so Node can load it.
 */
const casePath = /^\/project\/([\w-]+)\/?$/;
const essayPath = /^\/essay\/([\w-]+)\/?$/;
const careerPath = /^\/career\/?$/;

export const caseUrl = (id: string) => `/project/${encodeURIComponent(id)}`;
export const essayUrl = (id: string) => `/essay/${encodeURIComponent(id)}`;

/** Read the view from a path, falling back to the older hash routes (#case=…, #essay=…, #career…). */
export function routeFromLocation(pathname: string, hash: string): string {
  const fragment = hash.replace(/^#/, '');
  const project = pathname.match(casePath)?.[1];
  if (project) return `case=${project}`;
  const essay = pathname.match(essayPath)?.[1];
  if (essay) return `essay=${essay}`;
  if (careerPath.test(pathname)) return fragment ? `career=${fragment}` : 'career';
  return fragment;
}

/** The shareable URL for a view. */
export function urlForRoute(route: string): string {
  const params = new URLSearchParams(route);
  const project = params.get('case'), essay = params.get('essay'), role = params.get('career');
  if (project) return caseUrl(project);
  if (essay) return essayUrl(essay);
  if (role !== null) return role && role !== 'all' ? `/career#${encodeURIComponent(role)}` : '/career';
  return route ? `/#${route}` : '/';
}
