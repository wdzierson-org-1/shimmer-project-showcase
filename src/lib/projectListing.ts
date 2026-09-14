type Listable = { unlisted?: boolean | null };

/** Unlisted projects are shared by direct link only. Rows without the flag stay listed. */
export function listedProjects<T extends Listable>(projects: T[]): T[] {
  return projects.filter(project => !project.unlisted);
}

/** Ask AI may discuss an unlisted project only when opened from that project's own page. */
export function chatProjects<T extends Listable>(projects: T[], focus?: T): T[] {
  const listed = listedProjects(projects);
  return focus && !listed.includes(focus) ? [...listed, focus] : listed;
}
