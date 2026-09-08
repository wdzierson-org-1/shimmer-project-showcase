export const PROJECT_ORDER_COLUMN = 'display_order';

/** Admin and public readers use the same order, including deterministic ties. */
export function withProjectOrder<T extends { order(column: string, options: { ascending: boolean; nullsFirst?: boolean }): T }>(query: T): T {
  return query
    .order(PROJECT_ORDER_COLUMN, { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: true });
}

export function projectOrderUpdates(projects: { id: string; displayOrder: number | null }[]) {
  return projects.flatMap((project, index) => project.displayOrder === index ? [] : [{ id: project.id, display_order: index }]);
}
