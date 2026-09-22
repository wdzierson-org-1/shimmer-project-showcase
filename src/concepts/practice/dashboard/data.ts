export const dates = ['2021-09-04','2021-09-11','2021-09-18','2021-09-21','2021-09-25','2021-10-02','2021-10-09','2021-10-16','2021-10-23','2021-10-30','2021-11-06','2021-11-13','2021-11-20','2021-11-27','2021-12-04'];
export const regions = [
  { name:'Johor, Malaysia', scores:[7,7,8,8], trend:'steady', austerity:59, behavior:25, cases:[56,56.3,56,54.8,48,31.5,23,19.5,16.5,13.5,15.5,14.8,15.8,17.4,18.2], upper:[15.5,21,21.4,23,24], lower:[15.5,9.8,10.5,11.9,13] },
  { name:'Sabah, Malaysia', scores:[7,8,8,8], trend:'steady', austerity:56, behavior:29, cases:[44,46,48,47,44,40,35,30,28,26,24,24.5,25,25.8,26.5], upper:[24,30,32,33,34], lower:[24,19,18,18.5,19] },
  { name:'Selangor, Malaysia', scores:[9,10,10,10], trend:'steady', austerity:64, behavior:34, cases:[29,31,35,36,40,43,46,45,43,41,40,39,38.5,38,37], upper:[40,45,46,46.5,47], lower:[40,33,31,29,27] },
  { name:'Michigan, USA', scores:[10,11,10,10], trend:'steady', austerity:48, behavior:41, cases:[15,18,24,27,32,42,49,52,50,47,43,40,37,35,32], upper:[43,47,45,44,42], lower:[43,34,29,26,22] },
  { name:'Texas, USA', scores:[4,3,2,2], trend:'down', austerity:37, behavior:18, cases:[35,32,29,27,24,21,18,16,13,11,9,8,7.2,6.5,6], upper:[9,11,11.5,11,10.5], lower:[9,5,3.5,2.5,1.5] },
] as const;
export type Region = typeof regions[number];
export type Point = { x:number; y:number };
const start = Date.parse(`${dates[0]}T00:00:00Z`), duration = Date.parse(`${dates.at(-1)}T00:00:00Z`) - start;
export const xAt = (date: string) => 40 + (Date.parse(`${date}T00:00:00Z`) - start) / duration * 548;
export const yAt = (value: number) => 318 - value / 60 * 290;
export function points(values: readonly number[], offset = 0): Point[] { return values.map((v, i) => ({ x:xAt(dates[i + offset]), y:yAt(v) })); }
export function curve(points: Point[]) {
  return points.map((p, i) => {
    if (!i) return `M ${p.x},${p.y}`;
    const before = points[i - 2] || points[i - 1], from = points[i - 1], next = points[i + 1] || p;
    return `C ${from.x + (p.x - before.x) / 6},${from.y + (p.y - before.y) / 6} ${p.x - (next.x - from.x) / 6},${p.y - (next.y - from.y) / 6} ${p.x},${p.y}`;
  }).join(' ');
}
