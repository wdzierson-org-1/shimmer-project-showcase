import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowRight, Maximize2, Minimize2, Pause, Play, RotateCcw } from 'lucide-react';
import { createClock, SceneContext, type Clock } from './clock';
import type { Stage3D } from './particles';
import { Board, Customize, Paste, Send } from './scenes/app';
import { Pipeline } from './scenes/pipeline';
import { Close, HearBack, Hook, Kinds, System, TitleCard } from './scenes/stage';
import { at, cameraAt, cameraOf, captionAt, clamp, formatTime, H, mountedAt, sceneIndexAt, SCENES, TOTAL, W, type SceneDef, type SceneId } from './timeline';
import './gisted-reel.css';

/* The Gisted walkthrough: a film that is drawn rather than recorded. Ten scenes play on one clock
   over a fixed 1280 × 720 canvas, with a WebGL layer behind the DOM. Because every frame is a
   function of time, it can pause, seek, jump by chapter, and hold a still for reduced motion. */

const VIEWS: Record<SceneId, () => JSX.Element> = {
  hook: Hook, paste: Paste, pipeline: Pipeline, board: Board, customize: Customize,
  kinds: Kinds, send: Send, hearback: HearBack, system: System, close: Close,
};
/** The frame behind the play button: the finished title card. */
const POSTER = at('close', 5.4);

function SceneFrame({ def, clock }: { def: SceneDef; clock: Clock }) {
  const root = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const context = useMemo(() => ({ clock, start: def.start, world }), [clock, def.start]);
  useLayoutEffect(() => {
    const paint = (time: number) => {
      const local = time - def.start;
      // Every scrubbed animation in the scene reads this one number.
      root.current?.style.setProperty('--gr-t', local.toFixed(3));
      const cam = cameraOf(def, local);
      if (world.current) world.current.style.transform = `translate(${W / 2}px, ${H / 2}px) scale(${cam.zoom.toFixed(4)}) translate(${(-cam.x).toFixed(2)}px, ${(-cam.y).toFixed(2)}px)`;
    };
    paint(clock.time);
    return clock.onFrame(paint);
  }, [clock, def]);
  const View = VIEWS[def.id];
  return (
    <SceneContext.Provider value={context}>
      <div ref={root} className={`gr-scene gr-scene--${def.id}`}><View /></div>
    </SceneContext.Provider>
  );
}

export default function GistedReel() {
  const clock = useMemo(createClock, []);
  const theater = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const picture = useRef<HTMLDivElement>(null);
  const gl = useRef<HTMLCanvasElement>(null);
  const progress = useRef<HTMLInputElement>(null);
  const timer = useRef<HTMLOutputElement>(null);
  const three = useRef<Stage3D>();
  /** How much taller the stage is than the 16:9 picture inside it (1 unless the stage is narrower than 16:9). */
  const tall = useRef(1);
  const seen = useRef(false);

  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lit, setLit] = useState(false);
  /** No WebGL here (or it was lost): the scenes draw simple stand-ins for what the particles would have been. */
  const [flat, setFlat] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);

  const index = useSyncExternalStore(clock.subscribe, () => sceneIndexAt(clock.time));
  const mounted = useSyncExternalStore(clock.subscribe, () => mountedAt(clock.time).join(','));
  const captionKey = useSyncExternalStore(clock.subscribe, () => captionAt(clock.time)?.key ?? '');
  const caption = captionKey ? captionAt(clock.time) : null;

  const drawGl = useCallback((time: number, breath = 0) => {
    const cam = cameraAt(time);
    three.current?.draw(time, { x: cam.x, y: cam.y, zoom: cam.zoom / tall.current }, breath);
  }, []);

  const paint = useCallback((value: number) => {
    const time = clamp(value, 0, TOTAL);
    clock.set(time);
    if (progress.current) {
      progress.current.value = String(time);
      progress.current.style.setProperty('--gr-played', `${(time / TOTAL) * 100}%`);
    }
    const label = `${formatTime(time)} / ${formatTime(TOTAL)}`;
    if (timer.current && timer.current.value !== label) {
      timer.current.value = label;
      progress.current?.setAttribute('aria-valuetext', `${formatTime(time)} of ${formatTime(TOTAL)}, ${SCENES[sceneIndexAt(time)].label}`);
    }
    drawGl(time);
  }, [clock, drawGl]);

  // The WebGL layer loads on its own; the film plays without it if the browser can't provide one.
  useEffect(() => {
    const surface = gl.current;
    if (!surface) return;
    let disposed = false;
    const lost = (event: Event) => { event.preventDefault(); three.current?.dispose(false); three.current = undefined; setLit(false); setFlat(true); };
    surface.addEventListener('webglcontextlost', lost);
    import('./particles').then(({ createStage3D }) => {
      if (disposed) return;
      try {
        three.current = createStage3D(surface);
        const box = stage.current;
        if (box) three.current.resize(box.clientWidth, box.clientHeight);
        drawGl(seen.current ? clock.time : POSTER);
        setLit(true);
      } catch { three.current?.dispose(); three.current = undefined; setFlat(true); }
    }).catch(() => { if (!disposed) setFlat(true); });
    return () => {
      disposed = true;
      surface.removeEventListener('webglcontextlost', lost);
      three.current?.dispose(); three.current = undefined;
    };
  }, [clock, drawGl]);

  // The picture is composed at 1280 × 720 and scaled to fit; a wider stage shows more of the backdrop.
  useLayoutEffect(() => {
    const box = stage.current;
    if (!box) return;
    const fit = () => {
      const width = box.clientWidth, height = box.clientHeight;
      if (!width || !height) return;
      const k = Math.min(width / W, height / H);
      tall.current = height / (H * k);
      const left = (width - W * k) / 2, top = (height - H * k) / 2;
      if (picture.current) picture.current.style.transform = `translate(${left.toFixed(2)}px, ${top.toFixed(2)}px) scale(${k.toFixed(5)})`;
      // Shared with CSS, so anything laid over the picture can be placed in canvas px.
      box.style.setProperty('--gr-k', k.toFixed(5));
      box.style.setProperty('--gr-ox', `${left.toFixed(2)}px`);
      box.style.setProperty('--gr-oy', `${top.toFixed(2)}px`);
      three.current?.resize(width, height);
      drawGl(seen.current ? clock.time : POSTER);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [clock, drawGl]);

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { setReduced(preference.matches); if (preference.matches) setPlaying(false); };
    preference.addEventListener('change', change);
    const full = () => setExpanded(document.fullscreenElement === theater.current);
    document.addEventListener('fullscreenchange', full);
    // The product's example photographs, fetched before their scene needs them.
    new Image().src = '/portfolio/gisted/kinds.png';
    return () => { preference.removeEventListener('change', change); document.removeEventListener('fullscreenchange', full); };
  }, []);

  // It plays only while it's on screen.
  useEffect(() => {
    if (!started) return;
    const hide = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', hide);
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) setPlaying(false); }, { threshold: 0 });
    if (stage.current) observer.observe(stage.current);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', hide); };
  }, [started]);

  useEffect(() => {
    if (!playing || reduced) return;
    let frame = 0, previous = performance.now();
    const tick = (now: number) => {
      const next = Math.min(TOTAL, clock.time + Math.min((now - previous) / 1000, 0.1));
      previous = now;
      paint(next);
      if (next >= TOTAL) { setPlaying(false); setEnded(true); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, reduced, paint, clock]);

  // Before it starts, the spark behind the play button keeps breathing.
  useEffect(() => {
    if (started || reduced || !lit) return;
    let frame = 0, visible = false, last = 0;
    const origin = performance.now();
    const tick = (now: number) => {
      frame = 0;
      if (!visible || document.hidden) return;
      if (now - last > 30) { drawGl(POSTER, (now - origin) / 1000); last = now; }
      frame = requestAnimationFrame(tick);
    };
    const wake = () => { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; wake(); }, { threshold: 0.05 });
    if (stage.current) observer.observe(stage.current);
    document.addEventListener('visibilitychange', wake);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('visibilitychange', wake); };
  }, [started, reduced, lit, drawGl]);

  /** Where a chapter opens: its first frame, or its still when motion is reduced. */
  const opening = (i: number) => SCENES[i].start + (reduced ? SCENES[i].still : 0);

  function seek(time: number) {
    setEnded(time >= TOTAL);
    if (time >= TOTAL) setPlaying(false);
    paint(time);
    // And once more when React has drawn that moment's content, so measured overlays find it.
    requestAnimationFrame(() => paint(clock.time));
  }
  function begin() {
    seen.current = true;
    setStarted(true); setPlaying(!reduced);
    seek(opening(0));
    stage.current?.focus({ preventScroll: true });
  }
  function toggle() {
    if (reduced) { seek(opening((index + 1) % SCENES.length)); return; }
    if (ended) { seek(0); setPlaying(true); } else setPlaying((value) => !value);
  }
  function chapter(i: number) {
    seek(opening(i));
    if (!reduced) setPlaying(true);
  }
  function fullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void theater.current?.requestFullscreen().catch(() => {});
  }

  const current = SCENES[index];
  const shown = mounted ? mounted.split(',').map(Number) : [];

  return (
    <section className="gr" aria-label="Gisted: a walkthrough of the product and how it works">
      <div ref={theater} className={`gr-theater${expanded ? ' is-full' : ''}`}>
        <div className="gr-frame">
          <div
            ref={stage} className={`gr-stage${started ? ' is-started' : ''}${flat ? ' is-flat' : ''}`} tabIndex={started ? 0 : -1}
            role="group" aria-label="Walkthrough player. Space plays or pauses; the left and right arrows move three seconds."
            onKeyDown={(event) => {
              if ((event.target as HTMLElement).closest('button,input,a')) return;
              if (!started) return;
              if (event.code === 'Space') { event.preventDefault(); toggle(); }
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); seek(clock.time + (event.key === 'ArrowRight' ? 3 : -3)); }
            }}
          >
            <div className="gr-picture" role="img" aria-label={started ? `${current.label}. ${current.alt}` : 'Gisted. Don’t just send a link. Send the gist.'}>
              <canvas ref={gl} className="gr-gl" aria-hidden="true" hidden={!lit} />
              <div ref={picture} className="gr-canvas" aria-hidden="true">
                {started
                  ? shown.map((i) => <SceneFrame key={SCENES[i].id} def={SCENES[i]} clock={clock} />)
                  : <div className="gr-scene gr-poster"><div className="gr-world"><TitleCard at={-9} cta /></div></div>}
              </div>
            </div>
            {/* When the film is over, the address it ends on is a real link, laid over the drawn one. */}
            {ended && <a className="gr-visit" href="https://gisted.co" target="_blank" rel="noreferrer">gisted.co<ArrowRight size={15} /></a>}
            {!started && (
              <button type="button" className="gr-start" onClick={begin}>
                <span><Play size={15} fill="currentColor" />{reduced ? 'Step through the walkthrough' : 'Play the walkthrough'}</span>
                <small>{reduced ? `${SCENES.length} scenes · at your pace` : `${formatTime(TOTAL)} · ${SCENES.length} scenes · no sound`}</small>
              </button>
            )}
          </div>
          {started && caption && (
            <p className="gr-caption" key={caption.key}><span>{caption.kicker}</span>{caption.text}</p>
          )}
        </div>

        {started && (
          <div className="gr-controls">
            <button type="button" onClick={toggle} aria-label={reduced ? 'Next scene' : ended ? 'Replay' : playing ? 'Pause' : 'Play'}>
              {reduced ? <ArrowRight size={16} /> : ended ? <RotateCcw size={15} /> : playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <div className="gr-track">
              <input ref={progress} type="range" min={0} max={TOTAL} step={0.05} defaultValue={0} aria-label="Position in the walkthrough" onChange={(event) => seek(Number(event.target.value))} />
              <div className="gr-ticks" aria-hidden="true">{SCENES.slice(1).map((s) => <i key={s.id} style={{ left: `${(s.start / TOTAL) * 100}%` }} />)}</div>
            </div>
            <output ref={timer} aria-live="off">{formatTime(0)} / {formatTime(TOTAL)}</output>
            {document.fullscreenEnabled && (
              <button type="button" onClick={fullscreen} aria-label={expanded ? 'Exit full screen' : 'Full screen'}>
                {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            )}
          </div>
        )}
        {started && (
          <nav className="gr-chapters" aria-label="Walkthrough chapters">
            {SCENES.map((s, i) => <button type="button" key={s.id} aria-pressed={index === i} onClick={() => chapter(i)}>{s.label}</button>)}
          </nav>
        )}
      </div>

      <details className="gr-transcript">
        <summary>Read the walkthrough</summary>
        <ol>
          {SCENES.map((s) => (
            <li key={s.id}>
              <b>{s.label}</b>
              <p>{s.alt}</p>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
