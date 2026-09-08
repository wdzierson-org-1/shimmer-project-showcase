export type Geometry = { x: number; y: number; width: number; height: number };
export function constrainWindow(value: Geometry, viewport: { width: number; height: number }): Geometry {
 const margin = 12;
 const width = Math.min(Math.max(320, value.width), Math.max(1, viewport.width - margin * 2));
 const height = Math.min(Math.max(260, value.height), Math.max(1, viewport.height - margin * 2));
 return { width, height, x: Math.max(margin, Math.min(value.x, viewport.width - width - margin)), y: Math.max(margin, Math.min(value.y, viewport.height - height - margin)) };
}
