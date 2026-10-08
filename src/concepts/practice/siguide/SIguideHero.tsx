import { useEffect, useRef, useState } from 'react';
import { createDeviceScene, loadArtwork } from './DeviceScene';
import { DURATION, deviceFrame } from './sequence';
import './siguide.css';

type Scene = ReturnType<typeof createDeviceScene>;
export default function SIguideHero() {
  const stage = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), scene = useRef<Scene>();
  const clock = useRef({ time: 0, playing: true, visible: false, reduced: false });
  const wake = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(true), [time, setTime] = useState(0), [reduced, setReduced] = useState(false);
  const frame = deviceFrame(time), complete = time >= DURATION;
  useEffect(() => {
    const element = stage.current, surface = canvas.current;
    if (!element || !surface) return;
    const state = clock.current, controller = new AbortController(), media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false, request = 0, previous = 0, lastDraw = 0, lastReport = 0;
    function report() { setTime(state.time); setPlaying(state.playing); }
    function render(now: number) {
      request = 0;
      if (disposed || !scene.current || !state.visible || document.hidden || !state.playing) { previous = 0; return; }
      if (previous) state.time = Math.min(DURATION, state.time + Math.min((now - previous) / 1000, .1));
      previous = now;
      if (now - lastDraw >= 1000 / 30 || state.time === DURATION) {
        scene.current.draw(state.time); lastDraw = now - (now - lastDraw) % (1000 / 30);
        element!.style.setProperty('--si-blueprint', String(deviceFrame(state.time).wire));
      }
      if (state.time === DURATION) { state.playing = false; report(); return; }
      if (now - lastReport > 180) { report(); lastReport = now; }
      request = requestAnimationFrame(render);
    }
    function resume() {
      previous = 0;
      if (!disposed && !request && scene.current && state.visible && !document.hidden && state.playing) request = requestAnimationFrame(render);
    }
    wake.current = resume;
    function preference() {
      state.reduced = media.matches; setReduced(media.matches);
      if (media.matches) { state.playing = false; state.time = 7; scene.current?.draw(7); element!.style.setProperty('--si-blueprint', '0'); report(); }
    }
    preference(); media.addEventListener('change', preference);
    const observer = new IntersectionObserver(([entry]) => { state.visible = entry.isIntersecting; resume(); }, { threshold: .1 }); observer.observe(element);
    document.addEventListener('visibilitychange', resume);
    const resize = new ResizeObserver(([entry]) => {
      scene.current?.resize(entry.contentRect.width, entry.contentRect.height); scene.current?.draw(state.time);
    }); resize.observe(element);
    function lost(event: Event) {
      event.preventDefault(); state.playing = false; scene.current?.dispose(); scene.current = undefined;
      setFailed(true); setReady(false); report();
    }
    surface.addEventListener('webglcontextlost', lost);
    loadArtwork(controller.signal).then(photos => {
      if (disposed) return;
      try {
        scene.current = createDeviceScene(surface, photos);
        scene.current.resize(element.clientWidth, element.clientHeight); scene.current.draw(state.time);
        setReady(true); resume();
      } catch { scene.current?.dispose(); scene.current = undefined; state.playing = false; setFailed(true); report(); }
    });
    return () => {
      disposed = true; controller.abort(); cancelAnimationFrame(request); observer.disconnect(); resize.disconnect();
      media.removeEventListener('change', preference); document.removeEventListener('visibilitychange', resume); surface.removeEventListener('webglcontextlost', lost);
      scene.current?.dispose(); scene.current = undefined; wake.current = () => {};
    };
  }, []);

  function select(seconds: number) {
    const state = clock.current; state.time = seconds; state.playing = false;
    scene.current?.draw(seconds); stage.current?.style.setProperty('--si-blueprint', String(deviceFrame(seconds).wire));
    setTime(seconds); setPlaying(false);
  }
  function play(replay = false) {
    const state = clock.current;
    if (replay || state.time >= DURATION) state.time = 0;
    state.playing = replay || !state.playing; setPlaying(state.playing); setTime(state.time); wake.current();
  }
  return <figure className="si-hero">
    <div ref={stage} className={`si-stage${ready ? ' is-ready' : ''}`}>
      <div className="si-blueprint" aria-hidden="true"/>
      <div className="si-stage-label" aria-hidden="true"><span>Smithsonian Institution</span><span className="si-product-label">SiGuide / WIVID</span></div>
      <img className="si-poster" src="/portfolio/siguide/device-reference.webp" alt="Original SiGuide handheld by WIVID: a charcoal case, lime controls, and a landscape museum touchscreen." hidden={ready}/>
      <canvas ref={canvas} className="si-canvas" role="img" aria-label="Three-dimensional reconstruction of the SiGuide handheld by WIVID. Its schematic becomes a finished device, then the Postal Museum menu opens a tour and traces a path through the museum, and opens the Concord-style stagecoach object screen." hidden={!ready}/>
      {ready && <div className="si-phases" aria-hidden="true">{['Schematic', 'Device', 'Experience'].map((phase, i) => <span key={phase} data-active={frame.stage === phase}><b>0{i + 1}</b> {phase}</span>)}</div>}
    </div>
    {ready && <div className="si-controls">
      <div className="si-playback">
        {!reduced && <><button type="button" onClick={() => play()} aria-label={playing ? 'Pause device animation' : complete ? 'Replay device animation' : 'Play device animation'}>{playing ? 'Ⅱ Pause' : complete ? '↻ Replay' : '▷ Play'}</button>{!complete && <button type="button" onClick={() => play(true)} aria-label="Replay device animation">↻</button>}</>}
        <span className="si-status" role="status">{reduced ? 'Still view' : frame.stage}</span>
      </div>
      <div className="si-views" role="group" aria-label="View a device screen">
        <span>Explore the UI</span>{([['Home', 7, 'home'], ['Tour', 10.5, 'tour'], ['Map', 18, 'map'], ['Object', 22, 'object']] as const).map(([title, seconds, view]) => <button type="button" key={title} onClick={() => select(seconds)} aria-pressed={frame.screen === 1 && frame.view === view}>{title}</button>)}
      </div>
    </div>}
    <figcaption className="si-caption"><span>{failed ? 'Original SiGuide device photograph.' : 'SiGuide by WIVID. A reconstruction of the original device and interface.'}</span><a href="https://uilvozcryifnpldfpwiz.supabase.co/storage/v1/object/public/project_images/4jn2ard683w.png" target="_blank" rel="noreferrer">Original photograph ↗</a></figcaption>
  </figure>;
}
