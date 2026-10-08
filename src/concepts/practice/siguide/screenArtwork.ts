import { clamp, deviceFrame, smooth } from './sequence';

type Context = CanvasRenderingContext2D;
type Point = [number, number];
export function artworkCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  return { canvas, context };
}
function label(c: Context, text: string, x: number, y: number, size = 19, color = '#fff', font = 'Arial') {
  c.fillStyle = color; c.font = `${size}px ${font}`; c.fillText(text, x, y);
}
function panel(c: Context, x: number, y: number, w: number, h: number, r: number, color: string) {
  c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill();
}
function path(c: Context, points: Point[], color: string, width = 2, close = false) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  if (close) { c.closePath(); c.fillStyle = color; c.fill(); }
  else { c.strokeStyle = color; c.lineWidth = width; c.stroke(); }
}
function arrow(c: Context, x: number, y: number, color = '#fff') {
  path(c, [[x - 9, y], [x + 9, y], [x + 2, y - 7]], color, 2);
  path(c, [[x + 9, y], [x + 2, y + 7]], color, 2);
}
function crop(c: Context, image: HTMLImageElement, x: number, y: number, w: number, h: number, dx: number, dy: number, dw: number, dh: number) {
  // Reference coordinates were measured on an 1824 × 1368 preview; the originals are larger.
  const sx = image.width / 1824, sy = image.height / 1368;
  c.drawImage(image, x * sx, y * sy, w * sx, h * sy, dx, dy, dw, dh);
}
function ripple(c: Context, x: number, y: number, time: number) {
  if (time <= 0 || time >= 1) return;
  c.save(); c.globalAlpha = Math.sin(time * Math.PI) * .85;
  c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 8 + time * 22, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill(); c.restore();
}
function nav(c: Context) {
  c.fillStyle = '#91938f'; c.fillRect(0, 442, 640, 38);
  for (const x of [44, 122, 252, 336, 448]) path(c, [[x, 442], [x, 480]], '#535953', 1.5);
  path(c, [[10, 461], [22, 450], [34, 461], [30, 461], [30, 475], [15, 475], [15, 461], [10, 461]], '#eeecd2', 2);
  label(c, 'MAP', 60, 469, 20, '#eeecd2'); label(c, 'NEAR ME', 141, 469, 20, '#eeecd2');
  label(c, 'FIND', 271, 469, 20, '#eeecd2'); label(c, 'AUTO', 380, 469, 20, '#eeecd2');
  c.strokeStyle = '#eeecd2'; c.lineWidth = 2; c.beginPath(); c.arc(358, 462, 9, 0, Math.PI * 2); c.stroke();
  path(c, [[352, 461], [357, 466], [369, 452]], '#eeecd2', 2);
  path(c, [[594, 449], [628, 449], [628, 475], [594, 475], [594, 449], [611, 465], [628, 449]], '#eeecd2', 2);
}
function dottedBackground(c: Context) {
  c.fillStyle = '#757875'; c.fillRect(0, 0, 640, 480);
  c.fillStyle = '#91958f';
  for (let y = 2; y < 442; y += 4) for (let x = 2; x < 640; x += 4) c.fillRect(x, y, 1.1, 1.1);
}
function sun(c: Context, x: number, y: number) {
  const points: Point[] = [];
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, r = i % 2 ? 12 : 22; points.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  path(c, points, '#fff', 0, true);
}

export function createScreenArtwork(opening?: HTMLImageElement, letter?: HTMLImageElement, artifact?: HTMLImageElement) {
  // Native text and vectors at 3× resolution; only the archival photographs remain raster.
  const { canvas, context: c } = artworkCanvas(1920, 1440);
  const background = artworkCanvas(1920, 1440);
  background.context.scale(3, 3); dottedBackground(background.context);
  function home(time: number) {
    c.drawImage(background.canvas, 0, 0, 640, 480); c.fillStyle = '#080b09'; c.fillRect(0, 0, 640, 72);
    sun(c, 36, 31); label(c, 'Smithsonian', 72, 37, 23, '#fff', 'Georgia');
    c.font = 'italic 23px Georgia'; c.fillText('National Postal Museum', 72, 60);
    c.strokeStyle = '#afafa7'; c.lineWidth = 2; c.beginPath(); c.arc(615, 25, 14, 0, Math.PI * 2); c.stroke();
    label(c, 'i', 611, 34, 26, '#afafa7', 'Georgia');
    c.fillStyle = '#d7c8a5'; c.fillRect(0, 72, 640, 164);
    if (opening) crop(c, opening, 315, 373, 1193, 305, 0, 72, 640, 164);
    else label(c, 'Discover the stories behind the letters.', 25, 162, 25, '#443f32', 'Georgia');
    const rows = [['Interactive Map', '#5bbecd'], ['Gallery Guide', '#93c53d'], ['Today’s Events', '#e5ab51'], ['Tours', '#8965be'], ['Activities', '#91719f']];
    rows.forEach(([title, color], i) => {
      const progress = smooth((time - 5.1 - i * .13) / .7), y = 240 + i * 40;
      c.save(); c.globalAlpha = progress; c.translate(-28 * (1 - progress), 0);
      panel(c, -18, y, 442, 36, 18, color);
      c.fillStyle = '#ffffff70'; c.beginPath(); c.arc(24, y + 18, 14, 0, Math.PI * 2); c.fill(); arrow(c, 24, y + 18, color);
      label(c, title, 54, y + 25, 23); c.restore();
    });
    ['Museum Intro', 'Using SiGuide', 'My Settings'].forEach((title, i) => {
      label(c, title, 456, 265 + i * 44, 21); arrow(c, 621, 256 + i * 44);
      c.setLineDash([1, 4]); path(c, [[452, 281 + i * 44], [637, 281 + i * 44]], '#ccd0c6', 1.5); c.setLineDash([]);
    });
    ripple(c, 297, 379, (time - 8.45) / 1.05); nav(c);
  }
  function tour() {
    c.drawImage(background.canvas, 0, 0, 640, 480); panel(c, 0, 0, 450, 442, 16, '#8663b8');
    label(c, 'Letters and Letter Writing', 29, 30, 22);
    c.fillStyle = '#324b60'; c.fillRect(11, 66, 399, 185);
    if (letter) crop(c, letter, 344, 373, 705, 318, 16, 72, 384, 173);
    c.fillStyle = '#f2f1e6'; c.fillRect(0, 266, 441, 176);
    ['Listen to letters written by', 'ordinary Americans. Explore', 'the objects, stories, and journeys', 'of a nation connected by mail.'].forEach((line, i) => label(c, line, 13, 296 + i * 30, 21, '#373b35'));
    label(c, 'Overview', 468, 30, 22);
    path(c, [[608, 14], [626, 14], [626, 28], [608, 28], [608, 14]], '#fff', 2);
    path(c, [[626, 18], [634, 14], [634, 28], [626, 24]], '#fff', 2);
    path(c, [[456, 45], [640, 45]], '#50544f'); label(c, 'Tour Objects', 468, 76, 22);
    path(c, [[456, 90], [640, 90]], '#50544f');
    panel(c, 463, 290, 170, 37, 12, '#8965be'); label(c, 'View Path', 473, 316, 22);
    panel(c, 463, 335, 170, 37, 12, '#92c538'); label(c, 'Start Tour', 473, 361, 22);
    panel(c, 490, 392, 55, 36, 18, '#959994'); path(c, [[505, 410], [524, 400], [524, 420]], '#fff', 0, true); nav(c);
  }
  // The original isometric tour map is redrawn as a small, dimensional floor plan.
  function map(progress: number) {
    c.fillStyle = '#0005'; c.fillRect(0, 0, 640, 442);
    panel(c, 20, 20, 410, 388, 16, '#ede8c9');
    label(c, 'Tour Path', 35, 48, 23, '#666951'); panel(c, 393, 29, 27, 27, 10, '#ed9d2b');
    path(c, [[400, 36], [413, 49]], '#fff', 2); path(c, [[413, 36], [400, 49]], '#fff', 2);
    c.save(); c.beginPath(); c.rect(30, 92, 390, 301); c.clip();
    c.fillStyle = '#858883'; c.fillRect(30, 92, 390, 301);
    c.strokeStyle = '#93958e'; c.lineWidth = .7;
    for (let y = 95; y < 394; y += 3) { c.beginPath(); c.moveTo(30, y); c.lineTo(420, y); c.stroke(); }
    const project = ([x, y]: Point, z = 0): Point => [226 + (x - 5) * (26 + y * 1.15), 126 + y * 25 - z];
    const floor: Point[] = [[3.7, 0], [6.2, .35], [6.2, 4], [9, 4], [10, 9.5], [0, 9.5], [1, 4], [3.3, 4], [3.3, 2], [3.7, 2]];
    path(c, floor.map(p => project(p)), '#e9e6df', 0, true);
    for (let y = 4; y < 10; y += 1.6) path(c, [project([1, y]), project([9, y])], '#dfdcd4', 3);
    function wall(a: Point, b: Point) {
      path(c, [project(a), project(b), project(b, 12), project(a, 12)], '#bda970', 0, true);
      path(c, [project(a, 12), project(b, 12)], '#eee0ad', 4);
    }
    for (let i = 0; i < floor.length; i++) wall(floor[i], floor[(i + 1) % floor.length]);
    const inside: [Point, Point][] = [[[3.6, 1.35], [5.5, 1.7]], [[5.5, 1.7], [5.5, 5.1]], [[3.4, 3], [5.5, 3]], [[3.4, 3], [3, 5.7]], [[3, 5.7], [3.8, 5.85]], [[6.2, 4], [6.4, 5.8]], [[6.4, 5.8], [7.9, 5.5]], [[2.35, 5], [2.1, 8.3]], [[2.1, 8.3], [4.75, 8.3]], [[6.25, 8.3], [7.7, 8.3]], [[8.2, 8.3], [9, 8.3]], [[9, 8.3], [8.8, 7.35]]];
    inside.forEach(([a, b]) => wall(a, b));
    const route = [[5, 9], [1.45, 9], [1.15, 8.2], [1.7, 7.55], [1.65, 6.55], [2, 5.65], [1.6, 4.75], [3, 4.75], [3.5, 6.7], [3.3, 7.15], [4.1, 7.6], [7, 7], [8.1, 8.25], [7.6, 9.1]].map(p => project(p as Point));
    const lengths = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1]));
    const total = lengths.reduce((a, b) => a + b, 0), distance = total * progress;
    function at(d: number): Point {
      let remainder = d;
      for (let i = 0; i < lengths.length; i++) {
        if (remainder <= lengths[i]) { const t = remainder / lengths[i]; return [route[i][0] + (route[i + 1][0] - route[i][0]) * t, route[i][1] + (route[i + 1][1] - route[i][1]) * t]; }
        remainder -= lengths[i];
      }
      return route[route.length - 1];
    }
    for (let d = 0; d <= distance; d += 7) { const [x, y] = at(d); c.fillStyle = '#7166ae'; c.beginPath(); c.arc(x, y, 1.9, 0, Math.PI * 2); c.fill(); }
    [route[0], route[route.length - 1]].forEach(([x, y], i) => { c.fillStyle = i ? '#af3838' : '#65a450'; c.beginPath(); c.arc(x, y, 5.8, 0, Math.PI * 2); c.fill(); });
    const [x, y] = at(distance); c.strokeStyle = '#fbf9e3'; c.lineWidth = 2; c.fillStyle = '#655ba0'; c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill(); c.stroke();
    c.restore();
  }
  function object(time: number) {
    const frame = deviceFrame(time);
    c.drawImage(background.canvas, 0, 0, 640, 480);
    panel(c, 0, 0, 450, 442, 16, '#a5a6a1');
    label(c, 'Concord-style Stagecoach model,', 28, 27, 21);
    label(c, '1851', 28, 54, 21);
    c.fillStyle = '#727a65'; c.fillRect(0, 66, 450, 337);
    c.save(); c.beginPath(); c.rect(0, 66, 450, 337); c.clip();
    // A small, finite reveal brings the original object photography into focus.
    const scale = 1.035 - .035 * frame.objectPhoto;
    c.translate(225, 234.5); c.scale(scale, scale); c.translate(-225, -234.5);
    if (artifact) crop(c, artifact, 316, 361, 835, 626, 0, 66, 450, 337);
    else label(c, 'Concord-style Stagecoach', 26, 223, 26, '#eeecd2', 'Georgia');
    c.restore();
    label(c, 'About', 468, 30, 22);
    path(c, [[608, 14], [626, 14], [626, 28], [608, 28], [608, 14]], '#fff', 2);
    path(c, [[626, 18], [634, 14], [634, 28], [626, 24]], '#fff', 2);
    path(c, [[456, 45], [640, 45]], '#50544f'); label(c, 'Explore', 468, 76, 22);
    path(c, [[456, 90], [640, 90]], '#50544f');
    panel(c, 463, 290, 170, 37, 12, '#92c538'); label(c, 'Scrapbook it!', 473, 315, 20);
    path(c, [[602, 297], [626, 297], [626, 319], [602, 319], [602, 297]], '#fff', 1.6);
    for (let y = 300; y <= 316; y += 4) path(c, [[598, y], [606, y]], '#fff', 1.6);
    c.fillStyle = '#fff'; c.fillRect(608, 310, 8, 5); c.beginPath(); c.arc(620, 303, 3, 0, Math.PI * 2); c.fill();
    panel(c, 463, 335, 170, 37, 12, '#92c538'); label(c, 'Locate on Map', 473, 361, 20);
    panel(c, 490, 392, 55, 36, 18, '#959994'); path(c, [[505, 410], [524, 400], [524, 420]], '#fff', 0, true);
    c.strokeStyle = '#deded4'; c.lineWidth = 1.5; c.beginPath(); c.arc(430, 421, 12, 0, Math.PI * 2); c.stroke(); label(c, 'C', 422, 428, 20, '#deded4');
    nav(c);
  }
  function draw(time: number) {
    const frame = deviceFrame(time); c.setTransform(3, 0, 0, 3, 0, 0); c.globalAlpha = 1; c.clearRect(0, 0, 640, 480);
    if (frame.object === 1) { object(time); return; }
    if (time < 10.05) home(time); else tour();
    if (time >= 9.6 && time < 10.05) { c.save(); c.globalAlpha = smooth((time - 9.6) / .45); tour(); c.restore(); }
    if (time >= 12) { const reveal = smooth((time - 12) / .5); c.save(); c.globalAlpha = reveal; c.translate(0, (1 - reveal) * 12); map(frame.route); c.restore(); }
    else if (time >= 11) ripple(c, 552, 308, clamp((time - 11) / .9));
    if (frame.object > 0) { c.save(); c.globalAlpha = frame.object; object(time); c.restore(); }
  }
  return { canvas, draw };
}

export function createDeviceArtwork() {
  const badge = artworkCanvas(192, 1152), maker = artworkCanvas(512, 400), grain = artworkCanvas(128, 128);
  const b = badge.context; b.beginPath(); b.roundRect(0, 0, 192, 1152, [8, 8, 70, 70]); b.clip();
  b.fillStyle = '#23afd0'; b.fillRect(0, 0, 192, 1152);
  b.fillStyle = '#b6c933'; b.beginPath(); b.ellipse(60, 22, 180, 225, -.15, 0, Math.PI * 2); b.fill();
  for (let y = 8; y < 1152; y += 15) for (let x = 8; x < 192; x += 15) {
    b.fillStyle = y < 245 ? '#f3f5d6' : '#128aad'; b.globalAlpha = y < 245 ? .85 : Math.max(0, (y - 840) / 312) * .5;
    const size = y < 245 ? 1.5 + ((x * 13 + y * 7) % 7) * .65 : 2.8;
    b.beginPath(); b.arc(x, y, size, 0, Math.PI * 2); b.fill();
  }
  b.globalAlpha = 1; b.translate(45, 272); b.rotate(Math.PI / 2); b.font = 'italic 128px Georgia'; b.fillStyle = '#ecf5eb'; b.fillText('SiGuide', 0, 0);
  const m = maker.context; m.textAlign = 'center';
  for (const [offset, ink] of [[2, '#899391'], [0, '#182226']] as const) {
    m.save(); m.translate(offset, offset); label(m, 'WIVID', 256, 227, 85, ink, 'Georgia'); label(m, 'SYSTEMS', 256, 294, 40, ink);
    for (const r of [30, 51, 73]) { m.beginPath(); m.arc(256, 138, r, Math.PI * 1.18, Math.PI * 1.82); m.strokeStyle = ink; m.lineWidth = 8; m.stroke(); }
    m.restore();
  }
  const pixels = grain.context.createImageData(128, 128); let seed = 31;
  for (let i = 0; i < pixels.data.length; i += 4) { seed = (seed * 16807) % 2147483647; const value = 110 + (seed % 36); pixels.data.set([value, value, value, 255], i); }
  grain.context.putImageData(pixels, 0, 0);
  return { badge: badge.canvas, maker: maker.canvas, grain: grain.canvas };
}
